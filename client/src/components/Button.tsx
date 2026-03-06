import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
}

export const Button: React.FC<Props> = ({ children, className = '', onClick = () => {}, ...props }) => {
    return (
        <button className={`btn btn-primary ${className}`} type='button' onClick={onClick} {...props}>
            {children}
        </button>
    );
};
