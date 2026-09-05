import React, { Suspense } from 'react'
import Container from '../global/Container'
import Logo from './Logo'
import NavSearch from '../home/HeroSearch'
import CartButton from './CartButton'
import DarkMode from './DarkMode'
import LinksDropdown from './LinksDropdown'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

async function Navbar() {
  const { userId } = await auth();
  const isAdmin = userId === process.env.ADMIN_USER_ID;

  return (
    <div className='border-b'>
      <Container className='flex flex-col sm:flex-row sm:justify-between sm:items-center flex-wrap ' >
        <Logo />
        <div className='flex gap-10'>
          <Link href={'/'}>
            Home
          </Link>
          <Link href={'/products'}>
            Products
          </Link>
          <Link href={'/orders'}>
            Orders
          </Link>
          <Link href={'/favorites'}>
            Favorites
          </Link>

        </div>


        <div className='flex gap-4 items-center'>
          <CartButton />
          <DarkMode />
          <LinksDropdown isAdmin={isAdmin} />

        </div>
      </Container>
    </div>
  )
}

export default Navbar