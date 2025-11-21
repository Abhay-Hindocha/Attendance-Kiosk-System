import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white/5 backdrop-blur-sm border-t border-white/20 px-4 md:px-8 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs md:text-sm text-slate-400">
        <p>Powered by FaceRecognition AI v2.0</p>
        <p className="text-center md:text-right">For support, contact IT Help Desk</p>
      </div>
    </footer>
  );
};

export default Footer;
