'use client'

import { signInWithGitlab } from '@/utils/actions';
import Image from 'next/image';
import { FormEvent } from 'react';

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
      className="flex-1 flex min-h-screen justify-center items-center bg-black"
    >
      <button className="bg-gray-800 p-8 rounded-xl cursor-pointer hover:border hover:border-white active:scale-95 text-white">

              <Image
              className="mb-3 w-40 h-30"
              src="https://about.gitlab.com/images/press/gitlab-logo-500-rgb.svg"
              width={200}
              height={200}
              alt="GitHub logo"
              priority={true}
            />
            <span>Sign in with Gitlab</span>
      </button>
    </form>
  );
}