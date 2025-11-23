import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({
    size = 'md',
    className = ''
}) => {
    const sizes = {
        sm: 32,
        md: 48,
        lg: 64
    };

    const dimension = sizes[size];

    return (
        <img
            src="/asserts/icon.png"
            alt="ResearchFlow"
            width={dimension}
            height={dimension}
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
};

export default Logo;
