import clsx from 'clsx';
import { useIsValid } from 'remix-validated-form';

import { useNavigation } from '@remix-run/react';

export default function SubmitButton({
  message,
  className,
  disabled,
}: {
  message: string;
  className?: string;
  disabled?: boolean;
}) {
  const isValid = useIsValid();
  const navigation = useNavigation();

  return (
    <button
      className={clsx(
        'btn btn-primary btn-sm !h-10 w-[90px] rounded-lg text-base-100',
        className
      )}
      type="submit"
      disabled={navigation.state !== 'idle' || !isValid || disabled}
    >
      {message}
    </button>
  );
}
