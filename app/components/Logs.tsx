import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';

interface LogsProps {
  logs: string[];
}

export default function Logs({ logs }: LogsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const logsRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      logsRef?.current?.scrollIntoView();
    }
  }, [isExpanded]);

  return (
    <div className="mb-4 flex flex-col justify-center gap-4">
      <hr />
      <div className="flex place-content-start items-center gap-2">
        <h3 className="cursor-pointer text-lg">Search logs</h3>
        {isExpanded && (
          <ChevronUpIcon
            className="cursor-pointer"
            onClick={_e => setIsExpanded(false)}
            width="20"
            height="20"
          />
        )}
        {!isExpanded && (
          <ChevronDownIcon
            className="cursor-pointer"
            onClick={_e => setIsExpanded(true)}
            width="20"
            height="20"
          />
        )}
      </div>
      {isExpanded && (
        <div className="flex w-full flex-col items-start gap-2" ref={logsRef}>
          {logs.map(log => (
            <p key={log} className="text-sm text-gray-500">
              {log}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
