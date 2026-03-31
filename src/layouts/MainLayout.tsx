import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className='flex flex-1 min-h-0'>
      <aside className='w-64 bg-gray-900 text-white p-4'>
        <h1 className='text-xl font-bold mb-6'>Data Vault</h1>
        <nav className='flex flex-col gap-2'>
          <a href='/' className='hover:text-blue-400'>Dashboard</a>
        </nav>
      </aside>
      <main className='flex-1 overflow-auto bg-gray-100 p-6'>
        <Outlet />
      </main>
    </div>
  );
}
