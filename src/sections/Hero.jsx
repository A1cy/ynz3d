import { useMediaQuery } from 'react-responsive';
import AnimatedHeaderSection from '../components/AnimatedHeaderSection';
const Hero = () => {
  const isMobile = useMediaQuery({ maxWidth: 853 });
  const text = `We help growing brands and organizations achieve their marketing and communication goals through integrated solutions that combine creativity, innovation, and expertise`;
  return (
    <section id="home" className="flex flex-col justify-end min-h-screen">
      <AnimatedHeaderSection
        subTitle={'Effective Communication Makes a Difference'}
        title={'YNZ'}
        text={text}
        textColor={'text-white'}
      />
    </section>
  );
};

export default Hero;
