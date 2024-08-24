"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { auth, SignedIn, SignedOut, useAuth, UserButton } from '@clerk/nextjs'
import { navLinks } from '@/constants'
import { usePathname } from 'next/navigation'
import { Button } from '../ui/button'
import { Steps } from 'intro.js-react'
import { getUserById, updateTour } from '@/lib/actions/user.actions'

const steps = [
  {
    element: '#login-button',
    intro: 'To can use image processing.You need to Login Or Signup first🥳.You can Login or Signup by clicking login button',
  }
];
const navSteps = [
  {
    element: '#Home',
    intro: 'In Home page, you can watch other people images and you can search what do you want to see.',
  },
  {
    element: '#ImageRestore',
    intro: 'In Image restore pgae you can restore your image old image.',
  },
  {
    element: '#GenerativeFill',
    intro: 'In generative fill page you can resize your image with aspect ratio as you want.',
  },
  {
    element: '#ObjectRemove',
    intro: 'In object remove page you can remove everything that you don\'t want, just by typing text you want to remove.🤩',
  },
  {
    element: '#ObjectRecolor',
    intro: 'In object recolor page you can change color by typing color that you want to change.',
  },
  {
    element: '#BackgroundRemove',
    intro: 'In background remove page you can remove your image background by clicking button.',
  },
  {
    element : "#Profile",
    intro : 'In profile page, you can see your credits that will be used for every image processing. And you can also watch your images.'
  },
  {
    element : "#credit",
    intro : 'This credit will be one image processing per one credit.',
    position : 'right'
  },
  {
    element : "#BuyCredits",
    intro : 'In credits page, you can buy credit that can use for image processing if you ran out your credits.'
  },
];
const Sidebar = () => {
  const pathname = usePathname();
  const {userId} = useAuth();
  const [showLoginStep,setShowLoginStep] = useState(false);
  const [showAuthNavStep,setShowAuthNavStep] = useState(false);
  const [user,setUser] = useState<any>(null);
  const [authNavSteps,setAuthNavSteps] = useState(navSteps)
  useEffect(() => {
    if(!userId && !localStorage.getItem('isDoneLoginStep')){
      setShowLoginStep(true);
    }
  },[])


  useEffect(() => {
    const getUser = async () => {
      const user = await getUserById(userId as string);
      setUser(user);
    };

    if(userId){
      getUser();
    }

  },[userId])


  useEffect(() => {
    if(userId && !localStorage.getItem('isDoneAuthNav'+userId) && !user?.isAuthTourDone){
      setShowAuthNavStep(true);
    }
  },[])

  useEffect(() => {
    console.log('change path nae')
    let updatedAuthSteps = navSteps.filter(step => {
      let element = document.querySelector(step.element);
      return !!element?.getClientRects().length
    })
    console.log(updatedAuthSteps)
    setAuthNavSteps(updatedAuthSteps)
  },[pathname])


  const handleLoginStepExit = (stepIndex : any = steps.length) => {
    if(stepIndex!==0){
      localStorage.setItem('isDoneLoginStep',true);
    }
    setShowLoginStep(false)
  }
  const handleAuthNavStepExit = async(stepIndex : any = authNavSteps.length) => {
    if(stepIndex != 0){
      localStorage.setItem('isDoneAuthNav'+userId,true);
      const response = await updateTour(userId as string,!!localStorage.getItem('isDoneLoginStep'),!!localStorage.getItem('isDoneAuthNav' + userId))
    }
    setShowAuthNavStep(false)
  }

  console.log(user)

  return (
    <>
    <Steps
        enabled={showLoginStep}
        steps={steps}
        options={{
          exitOnEsc : false,
          exitOnOverlayClick : false
        }}
        onComplete={handleLoginStepExit}
        initialStep={0}
        onExit={handleLoginStepExit}
      />

      <Steps
        enabled={showAuthNavStep}
        steps={authNavSteps}
        options={{
          exitOnEsc:false,
          exitOnOverlayClick : false
        }}
        onComplete={handleAuthNavStepExit}
        initialStep={0}
        onExit={handleAuthNavStepExit}
      />
    <aside className="sidebar">
      <div className="flex side-full flex-col gap-4">
        <Link href="/" className="sidebar-logo">
          <Image src="/assets/images/logo.png" alt="logo" width={230} height={28}/>
        </Link>

        <nav className="sidebar-nav">
          <SignedIn>
            <ul className="sidebar-nav_elements">
              {navLinks.slice(0, 6).map((link)=>{
                const isActive = link.route === pathname
                return(
                  <li key={link.route} className={`sidebar-nav_element group ${
                    isActive ? 'bg-custom-active text-white' : 'text-gray-800'
                  }`}>
                    <Link id={link.label.split(' ').join('')} className="sidebar-link" href={link.route}>
                      <Image 
                        src={link.icon}
                        alt="logo"
                        width={24}
                        height={24}
                        className={`${isActive && 'brightness-200'}`}
                      />
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              </ul>

            <ul className="sidebar-nav_elements">
            {navLinks.slice(6).map((link)=>{
                const isActive = link.route === pathname
                return(
                  <li id={link.label.split(' ').join('')} key={link.route} className={`sidebar-nav_element group ${
                    isActive ? 'bg-[#00273f] text-white' : 'text-gray-700'
                  }`}>
                    <Link className="sidebar-link" href={link.route}>
                      <Image 
                        src={link.icon}
                        alt="logo"
                        width={24}
                        height={24}
                        className={`${isActive && 'brightness-200'}`}
                      />
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              <li className="flex-center cursor-pointer gap-2 p-4">
                <UserButton afterSignOutUrl='/' showName />
              </li>
            </ul>
          </SignedIn>

          <SignedOut>
            <Button asChild id="login-button" className="button bg-[#00273f] bg-cover">
              <Link href="/sign-in">Login</Link>
            </Button>
          </SignedOut>
        </nav>
      </div>
    </aside>
    </>
  )
}

export default Sidebar