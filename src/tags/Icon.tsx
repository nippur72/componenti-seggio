// copia di src/tags/Icon.tsx dell'app presenze
// https://fontawesome.com/search

interface Props {
    icon: string;
    iconsize?: string;
    className?: any;
    type?: 'solid' | 'regular' | 'brands';
}

export function Icon(props: Props) {
    const { icon, iconsize, className, type = 'solid', ...otherProps } = props;

    const sizeClass = iconsize ? `fa-${iconsize}` : "";

    let styleClass = 'fas'; // default to solid
    if (type === 'regular') styleClass = 'far';
    if (type === 'brands') styleClass = 'fab';

    return <i className={`${styleClass} fa-${icon} ${sizeClass} ${className || ''}`} aria-hidden="true" {...otherProps}></i>;
}
