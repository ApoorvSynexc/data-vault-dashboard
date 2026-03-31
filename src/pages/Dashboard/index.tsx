import { useEffect } from 'react';
import { userService } from '../../services';

export default function Dashboard() {
  useEffect(() => {
    userService.getMyProfile().then((profile) => {
      console.log('my-profile', profile);
    });
  }, []);

  return (
    <div>
      <h2 className='text-2xl font-semibold'>Dashboard</h2>
    </div>
  );
}
