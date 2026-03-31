import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className='flex w-full min-h-full items-center justify-center px-4 py-8 md:px-6'>
      <div className='mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[1.28fr_0.72fr]'>
        <div className='relative px-8 py-10 md:px-12 md:py-14'>
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_36%)]' />

          <div className='relative'>
            <div className='mb-6 inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-700'>
              <span className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm'>
                <svg
                  viewBox='0 0 24 24'
                  className='h-4 w-4'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M12 3L4 7V12C4 17 7.4 21.4 12 22C16.6 21.4 20 17 20 12V7L12 3Z'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M9.5 11.5L11.2 13.2L14.8 9.6'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </span>
              Error 404
            </div>

            <h1 className='max-w-[30rem] text-4xl font-bold tracking-tight text-slate-900 md:text-5xl'>
              The page you requested could not be found.
            </h1>

            <p className='mt-4 max-w-[32rem] text-base leading-7 text-slate-500 md:text-lg'>
              The link may be outdated, the address may be mistyped, or this route has not been
              added yet.
            </p>

            <div className='mt-7 flex flex-col gap-3 sm:flex-row'>
              <Link
                to='/'
                className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700'
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-8 py-12 text-white'>
          <div className='text-center'>
            <p className='text-sm font-semibold uppercase tracking-[0.32em] text-blue-200/80'>
              Not Found
            </p>
            <div className='mt-3 text-[6.5rem] font-black leading-none tracking-[-0.08em] md:text-[8rem]'>
              404
            </div>
            <div className='mx-auto mt-5 h-px w-20 bg-white/20' />
            <p className='mx-auto mt-5 max-w-[14rem] text-sm leading-6 text-slate-300'>
              Try heading back to the dashboard and continue from a known route.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
