import HomepageCards from '@/components/homepage-cards';
import HomepageFooter from '@/components/homepage-footer';
import HomepageHeader from '@/components/homepage-header';
import HomepageSection from '@/components/homepage-section';


export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
return (
        <>
            <HomepageHeader />
            <HomepageSection />
            <HomepageCards />
            <HomepageFooter />
        </>
    );
}

