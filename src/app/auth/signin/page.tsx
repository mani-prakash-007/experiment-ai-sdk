'use client'

import { signInWithGitlab } from '@/utils/actions';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useState } from 'react';

export default function LoginForm() {


  const handleGitlabLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      await signInWithGitlab()
    } catch (err) {
      console.error('Signin Error : ', err)
    }
  }

  return (
    <form
      onSubmit={handleGitlabLogin}
      className="flex-1 flex min-h-screen justify-center items-center"
    >
      <button className="bg-gray-800 p-8 rounded-xl cursor-pointer hover:border hover:border-white active:scale-95">

              <Image
              className="mx-auto mb-3"
              src="https://about.gitlab.com/images/press/gitlab-logo-500-rgb.svg"
              width={100}
              height={100}
              alt="GitHub logo"
              priority={true}
            />
            <span>Sign in with Gitlab</span>
      </button>
    </form>
  );
}