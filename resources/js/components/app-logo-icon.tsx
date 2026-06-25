import type { ImgHTMLAttributes } from 'react';
export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
       <img src ="/images/SHRMS.png" alt="App Logo" className='size-8 fill-current' {...props}/>
    );
}
