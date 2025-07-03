import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      fill="currentColor"
      {...props}
    >
      <path d="M224,48H32a8,8,0,0,0-8,8V192a8,8,0,0,0,8,8H224a8,8,0,0,0,8-8V56A8,8,0,0,0,224,48ZM96,168H64V136h32Zm0-48H64V88h32Zm80,48H128V136h48Zm0-48H128V88h48Z" />
    </svg>
  );
}
