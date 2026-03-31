type FormErrorProps = {
  message?: string;
};

export default function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      role='alert'
      className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'
    >
      {message}
    </p>
  );
}
