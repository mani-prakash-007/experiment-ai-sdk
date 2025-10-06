'use server'

import { Provider } from '@supabase/supabase-js'
import { createClientForServer } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Generic OAuth
 */
const signInWith = (provider: Provider) => {
  return async () => {
    const supabase = await createClientForServer()
    const auth_callback_url = `${process.env.NEXT_SITE_URL}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: auth_callback_url },
    })

    if (error) {
      console.error('OAuth sign-in error:', error)
      return { error }
    }

    if (data?.url) {
      redirect(data.url)
    }
  }
}
 
//  Gitlab - OAuth

const signInWithGitlab = signInWith('gitlab')



//  Email/Password Sign In

const signInWithEmail = async (email: string, password: string) => {
  const supabase = await createClientForServer()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Email sign-in error:', error)
    return { error }
  }

  redirect('/chat')
}


//  Email/Password Sign Up

const signUpWithEmail = async (email: string, password: string) => {
  const supabase = await createClientForServer()
  const auth_callback_url = `${process.env.NEXT_SITE_URL}/auth/callback`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: auth_callback_url,
    },
  })

  if (error) {
    console.error('Email sign-up error:', error)
    return { error }
  }

  return { success: true }
}


  // Sign-out

const signOut = async () => {
  const supabase = await createClientForServer()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign-out error:', error)
  }
  redirect('/auth/signin')
}

export {
  signInWithGitlab,
  signInWithEmail,
  signUpWithEmail,
  signOut,
}