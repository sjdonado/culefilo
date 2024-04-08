import { useIsValid } from 'remix-validated-form';

import { useNavigation } from '@remix-run/react';

export default function SubmitButton({
  message,
  disabled,
}: {
  message: string;
  disabled?: boolean;
}) {
  const isValid = useIsValid();
  const navigation = useNavigation();

  return (
    <button
      className="btn btn-primary btn-sm !h-10 w-[90px] rounded-lg font-normal text-base-100"
      type="submit"
      disabled={navigation.state !== 'idle' || !isValid || disabled}
    >
      {message}
    </button>
  );
}
