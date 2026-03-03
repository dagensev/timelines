import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    text: string;
}

export const Button: React.FC<Props> = ({ className = '', onClick = () => {}, text = '', ...props }) => {
    return (
        <button className={`btn btn-primary ${className}`} type='button' onClick={onClick} {...props}>
            {text}
        </button>
    );
};
