import type { InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    className?: string;
    inputClassName?: string;
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
}

export const Input: React.FC<Props> = ({ className = '', inputClassName = '', value = '', label = '', onChange = () => {}, ...props }) => {
    const onChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e?.target.value);
    };

    return (
        <div className={`flex flex-col ${className}`}>
            {label && <label className='label-editorial'>{label}</label>}
            <input type='text' className={`input-editorial ${inputClassName}`} value={value} onChange={onChangeInternal} {...props} />
        </div>
    );
};
