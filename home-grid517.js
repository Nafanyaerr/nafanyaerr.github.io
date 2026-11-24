// Keep gallery row tracks on the 4px grid without cropping or stretching
// the existing artwork. A frame gains at most 4px of empty page background.
const galleryLinks=[...document.querySelectorAll('.home-frame501 .experiments-gallery .case-image-link')];
const owners=new WeakMap();
const observer=new ResizeObserver(entries=>{
  for(const {target} of entries){
    const link=owners.get(target),height=target.getBoundingClientRect().height;
    if(link&&height>0)link.style.height=`${Math.ceil((height-.01)/4)*4}px`;
  }
});
for(const link of galleryLinks){
  const artwork=link.firstElementChild;
  if(artwork){owners.set(artwork,link);observer.observe(artwork)}
}

// Snap the reserved illustration box, while the character inside keeps its
// original 32:45 proportions and the complete 51-column dance envelope.
const heroArt=document.querySelector('.home-frame501 .hero-art');
if(heroArt){
  const heroObserver=new ResizeObserver(()=>{
    const height=`${Math.ceil(heroArt.getBoundingClientRect().width*45/51/4)*4}px`;
    if(heroArt.style.height!==height)heroArt.style.height=height;
  });
  heroObserver.observe(heroArt);
}
