import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
gsap.registerPlugin(ScrollTrigger);
const ServiceSummary = () => {
  useGSAP(() => {
    gsap.to("#title-service-1", {
      xPercent: 20,
      scrollTrigger: {
        target: "#title-service-1",
        scrub: true,
      },
    });
    gsap.to("#title-service-2", {
      xPercent: -30,
      scrollTrigger: {
        target: "#title-service-2",
        scrub: true,
      },
    });
    gsap.to("#title-service-3", {
      xPercent: 100,
      scrollTrigger: {
        target: "#title-service-3",
        scrub: true,
      },
    });
    gsap.to("#title-service-4", {
      xPercent: -100,
      scrollTrigger: {
        target: "#title-service-4",
        scrub: true,
      },
    });
  });
  return (
    <section 
      id="service-summary" 
      className="mt-20 overflow-hidden font-light leading-snug text-center mb-42 contact-text-responsive relative"
      style={{ zIndex: 15 }} // Higher than Phoenix z-index (5) for text overlay
    >
      <div id="title-service-1">
        <p>Strategy</p>
      </div>
      <div
        id="title-service-2"
        className="flex items-center justify-center gap-3 translate-x-16"
      >
        <p className="font-normal">Communication</p>
        <div className="w-10 h-1 md:w-32 bg-gold" />
        <p>Marketing</p>
      </div>
      <div
        id="title-service-3"
        className="flex items-center justify-center gap-3 -translate-x-48"
      >
        <p>Branding</p>
        <div className="w-10 h-1 md:w-32 bg-gold" />
        <p className="italic">Digital Media</p>
        <div className="w-10 h-1 md:w-32 bg-gold" />
        <p>Innovation</p>
      </div>
      <div id="title-service-4" className="translate-x-48">
        <p>Excellence</p>
      </div>
    </section>
  );
};

export default ServiceSummary;
