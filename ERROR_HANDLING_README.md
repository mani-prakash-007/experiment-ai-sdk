# Minimal Error Handling with Retry Functionality

This implementation provides a simplified error handling approach for chat messages when AI SDK fails, network failures occur, or unexpected errors happen.

## Key Features

### 1. Simplified Message State
- **States**: `pending`, `success`, `error` (removed complex state transitions)
- **Error Storage**: Simple `ai_error_message` and `ai_retry_count` fields
- **Original Request**: Stored as `ai_original_request` with full model info for retry functionality

### 2. Error Detection & Handling
- **API Key Errors**: Detects invalid/missing API keys (401/403 errors)
- **Network Errors**: Automatic detection of connection failures
- **Timeout Errors**: Identifies request timeouts and silent failures
- **Rate Limiting**: Detects 429 errors and provides appropriate messaging  
- **Server Errors**: Handles 500 errors with user-friendly messages
- **Silent Failures**: 30-second timeout to catch cases where AI fails without error

### 3. Retry Functionality
- **One-Click Retry**: Simple retry button on failed messages
- **Original Request Recovery**: Automatically reconstructs the original request context
- **File Handling**: Regenerates presigned URLs for file attachments
- **Document Context**: Restores document references for editing mode
- **Retry Counter**: Tracks number of retry attempts

### 4. User Experience
- **Clear Error Messages**: User-friendly error descriptions instead of technical messages
- **Loading States**: Visual feedback during retry attempts
- **Dismiss Option**: Users can hide error messages
- **Non-blocking**: Errors don't prevent new messages

## Usage

### Automatic Error Handling
```typescript
// Errors are automatically caught and stored in the database
message.ai_state === 'error' // Message failed
message.ai_error_message     // User-friendly error description
message.ai_retry_count       // Number of retry attempts
```

### Manual Retry
```typescript
// Users can retry failed messages
<button onClick={() => onRetry(message.id)}>
  Retry
</button>
```

### Error Display
```typescript
// Simplified error UI component
{message.ai_state === 'error' && (
  <ErrorBubble 
    message={message}
    onRetry={handleRetry}
    onDismiss={handleDismiss}
  />
)}
```

## Implementation Benefits

1. **Minimal Complexity**: Reduced from complex state machines to simple error flags
2. **Robust Recovery**: Full request context preservation for reliable retries
3. **User-Friendly**: Clear error messages and easy retry mechanism
4. **Performance**: Lightweight error tracking with minimal database overhead
5. **Maintainable**: Simple code paths and reduced state management

## Error Types Handled

- **API Key Issues**: Invalid, missing, or unauthorized API keys
- **Network Failures**: Connection timeouts, DNS resolution failures
- **AI Service Errors**: Model unavailability, service overload
- **Rate Limiting**: Too many requests, quota exceeded  
- **Timeout Errors**: Request taking too long to complete
- **Silent Failures**: Cases where AI request fails without throwing error
- **Unexpected Errors**: Unhandled exceptions with graceful fallback

This approach balances simplicity with functionality, providing users with a reliable chat experience even when errors occur.

## API Key Error Fix

**Problem**: When API key is invalid, assistant message was created with `ai_state: 'success'` but empty content, while user message incorrectly stored the original request data.

**Solution**: 
1. **Enhanced Error Detection**: Added specific checks for API key errors (401/403)
2. **Silent Failure Detection**: 30-second timeout catches cases where AI fails without error
3. **Empty Response Handling**: If streaming completes with no content, marks as error
4. **Improved Error Messages**: Clear "Invalid API key" messages for authentication failures

Now when API key fails, the assistant message will show a proper error with retry functionality instead of appearing successful with no content.

## Retry Data Storage Fix

**Problem**: "Cannot retry: original request data not found" error when clicking retry button.

**Root Cause**: The `ai_original_request` was being stored on the user message, but retry function was looking for it on the assistant message (which has the error and retry button).

**Solution**:
1. **Moved Original Request Storage**: Now stores `ai_original_request` on the assistant message when it's created
2. **Improved Retry Logic**: Retry function now correctly finds the original request data on the same assistant message that shows the error
3. **Reuse Existing Message**: Instead of creating new assistant message for retry, reuses the existing failed message
4. **Proper State Management**: Retry clears error state and content before attempting again

The retry flow now works correctly: Click retry → Find original request → Clear error → Retry with same message → Show new result or error.

## Context Storage Analysis

### Complete Storage in `ai_original_request`
```typescript
ai_original_request: {
  input: string;           // ✅ Last user message
  model: ModelOption;      // ✅ Complete model info (id, name, provider)
  uploadedFile?: {         // ✅ Current file reference
    storagePath: string;
  };
  documentReference?: {    // ✅ Current document reference
    documentId: string;
    version?: number;
  };
  fullContext: any[];      // ✅ **NEW**: Complete conversation context
}
```

### Full Context Storage Benefits
- **Perfect Retry Fidelity**: Retry sends identical context as original request
- **Multi-turn Conversations**: Complete message history preserved
- **Historical Files**: All previous files in conversation included
- **Document Context**: Complete document references maintained
- **Consistent Results**: Retry produces same response as original attempt

## Model Provider Storage Fix

**Enhancement**: Added complete model information storage in `ai_original_request`.

**Previous**: Only stored model ID as string, missing provider information during retry.
```typescript
// Before
ai_original_request: {
  model: "gemini-2.5-flash" // Just ID, no provider info
}
```

**Current**: Stores complete model object with ID, name, and provider.
```typescript
// Now
ai_original_request: {
  model: {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash", 
    provider: "Google"
  }
}
```

**Benefits**:
- Retry now uses exact same model configuration
- No more "unknown" provider fallbacks
- Proper model selection for retry requests
- Maintains model context across retry attempts

## Full Conversation Context Storage

**Major Enhancement**: Store complete conversation context in `ai_original_request`.

**Problem**: Retries only sent last user message, losing conversation history and context.

**Solution**: Store the entire `contextToSend` array (complete conversation) for perfect retry fidelity.

**Implementation**:
```typescript
// Store complete context sent to AI
const originalRequestData = {
  // ... existing fields
  fullContext: JSON.parse(JSON.stringify(contextToSend)) // Deep copy of entire conversation
};

// Retry uses exact same context
const contextToSend = JSON.parse(JSON.stringify(orig.fullContext));
// + Regenerate presigned URLs for files (they may have expired)
```

**Benefits**:
- **Identical Retries**: Every retry sends exact same data as original request
- **Context Preservation**: Multi-turn conversations maintain full history
- **File Continuity**: All historical files in conversation included
- **Document References**: Complete document context preserved
- **Consistent AI Behavior**: Same input = same expected output
- **Backward Compatibility**: Fallback for messages created before this enhancement

## Loading State Fix

**Problem**: No message bubble appeared during document creation, causing users to see no feedback until completion.

**Root Cause**: 
- Assistant message created with empty content but not marked as actively streaming
- Document creation didn't show loading states when no text content was streaming
- `ai_state: 'pending'` messages weren't displaying loading indicators

**Solution**:
1. **Immediate Message Display**: Assistant message bubble appears instantly with loading state
2. **Document Creation Feedback**: Shows loading even when only document (not text) is being generated  
3. **Pending State Handling**: Messages with `ai_state: 'pending'` show loading indicators
4. **Progress Indicators**: "Generating..." and "Preparing document..." states work correctly

**User Experience**:
- ✅ Message bubble appears immediately when request starts
- ✅ Shows "Generating..." while AI is thinking
- ✅ Shows "Preparing document..." during document creation
- ✅ Visual feedback throughout the entire process