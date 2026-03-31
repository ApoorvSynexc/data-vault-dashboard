export default function NotFound() {
  return (
    <div className='flex items-center justify-center h-screen'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-300'>404</h1>
        <p className='text-gray-500 mt-2'>Page not found</p>
        <a href='/' className='text-blue-600 hover:underline mt-4 block'>Go home</a>
      </div>
    </div>
  );
}
