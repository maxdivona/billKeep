export default function Header() {
  return (
    <header className="bg-surface text-primary font-label-md text-label-md h-16 fixed top-0 right-0 left-64 border-b border-outline-variant flex justify-between items-center px-margin-desktop w-[calc(100%-16rem)] z-10">
      {/* Search Bar */}
      <div className="flex items-center bg-surface-container-low rounded-full px-md py-sm border border-outline-variant w-1/3 max-w-md focus-within:border-primary transition-colors">
        <span className="material-symbols-outlined text-on-surface-variant mr-sm">search</span>
        <input
          className="bg-transparent border-none outline-none w-full text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-0 p-0"
          placeholder="Cerca..."
          type="text"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-md">
        <button className="p-sm text-on-surface-variant hover:bg-surface-container rounded-full transition-all duration-150 flex items-center justify-center relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="p-sm text-on-surface-variant hover:bg-surface-container rounded-full transition-all duration-150 flex items-center justify-center">
          <span className="material-symbols-outlined">help</span>
        </button>
        <img
          alt="User profile photo"
          className="w-8 h-8 rounded-full object-cover ml-sm border border-outline-variant"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBowNXPEashSXPobvkZ0_I20aI8IUZmCr7RCMgzXXtOkDIPid4fGLoL1ysjND-amRE3JRM2TVTNmHowhvP2XyC-TCoTHOq13YXWaWPw60_0GCA2syAS99zc8sGZigAjWRsRAGZD7vMc7qXKBnaD9pPM30s4RVKVaIKK6_bFrhlfonxI3-Lvw5b-hUtWLI2Yz78m_HWPcTISYrFNe_DEmHVbsF7IU1MHC2moqqOpujDonxn4GnzEmJTRzg"
        />
      </div>
    </header>
  )
}
