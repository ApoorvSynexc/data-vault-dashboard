import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  console.log('my-profile', user);

  return (
    <div>
      <h2 className='text-2xl font-semibold'>Dashboard</h2>
    </div>
  );
}
