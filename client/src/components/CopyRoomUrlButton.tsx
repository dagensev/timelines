import { useState } from 'react';

interface Props {
    roomId: string;
}

export const CopyRoomUrlButton = ({ roomId }: Props) => {
    const [isCopied, setIsCopied] = useState(false);

    const onClick = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
        setIsCopied(true);
    };

    return (
        <button type='button' className='btn btn-sm rounded-md px-2' onClick={onClick} aria-label='Copy room URL' title='Copy room URL'>
            {isCopied ? (
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' viewBox='0 0 16 16'>
                    <path d='M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z' />
                </svg>
            ) : (
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-link' viewBox='0 0 16 16'>
                    <path d='M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z' />
                    <path d='M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4 4 0 0 1-.82 1H12a3 3 0 1 0 0-6z' />
                </svg>
            )}
        </button>
    );
};
