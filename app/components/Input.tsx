import clsx from 'clsx';
import { useField } from 'remix-validated-form';

import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  className?: string;
  icon?: JSX.Element;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

export default function Input({
  name,
  label,
  icon,
  className,
  onChange,
  value,
  forwardedRef,
  ...rest
}: InputProps) {
  const { error, getInputProps } = useField(name);

  return (
    <div className={clsx('mb-4', className)}>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-2 rounded-md">
        <div className="relative">
          <input
            ref={forwardedRef}
            className={clsx(
              'peer input input-sm input-bordered !h-10 w-full rounded-md !pl-9',
              error && 'input-error'
            )}
            {...rest}
            {...getInputProps({
              id: name,
              onChange,
              value,
            })}
          />
          {icon && icon}
        </div>
      </div>
      {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
    </div>
  );
}
