import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Menu, Moon, Music2, Phone, Send, Sun, Volume2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { registrationSchema, submitRegistration, type RegistrationInput } from "@/lib/registration.functions";
import danielAsset from "@/assets/daniel-korsa.jpg.asset.json";
import gosaAsset from "@/assets/gosa-alemayehu.jpg.asset.json";
import centerAsset from "@/assets/training-center-room.jpg.asset.json";
import keyboardAsset from "@/assets/yamaha-keyboard.jpg.asset.json";
import sessionAsset from "@/assets/keyboard-session.jpg.asset.json";
import saxAsset from "@/assets/saxophone-detail.jpg.asset.json";
import guitarAsset from "@/assets/red-acoustic-guitar.jpg.asset.json";
import { assetUrl } from "@/lib/asset-url";
import { ImageHealthCheck } from "@/components/image-health-check";
import { listGalleryPhotos } from "@/lib/gallery.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glory Music Center | Unlock Your Musical Potential" },
      { name: "description", content: "Premium multilingual music academy in Bale Robe, Oromia, Ethiopia offering piano, keyboard, guitar, and saxophone training with a modern registration experience." },
      { property: "og:title", content: "Glory Music Center" },
      { property: "og:description", content: "Unlock Your Musical Potential at Glory Music Center in Bale Robe, Oromia, Ethiopia." },
      { property: "og:image", content: assetUrl(centerAsset) },
      { name: "twitter:image", content: assetUrl(centerAsset) },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicSchool",
          name: "Glory Music Center",
          description: "Professional piano, keyboard, guitar, and saxophone training for children, youth, and adults.",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Bale Robe",
            addressRegion: "Oromia",
            addressCountry: "Ethiopia",
          },
          telephone: ["+251910287951", "+251920024558"],
          email: "gosaalemayehu701@gmail.com",
          sameAs: [
            "https://www.tiktok.com/@glorymusic17",
            "https://t.me/glorymusiccenter",
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

type Lang = "en" | "am" | "om";
type ThemeMode = "light" | "dark";
type GalleryCategory = "all" | "piano" | "guitar" | "keyboard" | "saxophone" | "performances" | "events";

type Copy = {
  brandName: string;
  tagline: string;
  nav: { home: string; about: string; courses: string; gallery: string; testimonials: string; registration: string; faq: string; contact: string };
  heroTitle: string;
  heroSubtitle: string;
  registerNow: string;
  exploreCourses: string;
  aboutTitle: string;
  aboutBody1: string;
  aboutBody2: string;
  foundersTitle: string;
  founderRole: string;
  coursesTitle: string;
  whyChooseUsTitle: string;
  successTitle: string;
  galleryTitle: string;
  testimonialsTitle: string;
  registrationTitle: string;
  registrationSubtitle: string;
  faqTitle: string;
  contactTitle: string;
  language: string;
  lightMode: string;
  darkMode: string;
  successMessage: string;
  form: { fullName: string; age: string; gender: string; phone: string; parent: string; email: string; course: string; schedule: string; message: string; submit: string; required: string };
  genders: { male: string; female: string; other: string };
  schedules: { morning: string; afternoon: string; weekend: string };
  courses: { piano: string; keyboard: string; guitar: string; saxophone: string; vocal: string };
  filters: { all: string; piano: string; guitar: string; keyboard: string; saxophone: string; vocal: string; performances: string; events: string };
  mapTitle: string;
  addressLabel: string;
  callNow: string;
  whatsapp: string;
  sendEmail: string;
  footerRights: string;
};

const content: Record<Lang, Copy> = {
  en: {
    brandName: "Glory Music Center",
    tagline: "Unlock Your Musical Potential",
    nav: { home: "Home", about: "About Us", courses: "Courses", gallery: "Gallery", testimonials: "Testimonials", registration: "Registration", faq: "FAQ", contact: "Contact" },
    heroTitle: "Unlock Your Musical Potential",
    heroSubtitle: "Professional piano, keyboard, guitar, and saxophone training for children, youth, and adults in Bale Robe, Oromia, Ethiopia.",
    registerNow: "Register Now",
    exploreCourses: "Explore Courses",
    aboutTitle: "About Glory Music Center",
    aboutBody1: "Glory Music Center is dedicated to developing musical talent through professional instruction, creativity, discipline, and performance excellence.",
    aboutBody2: "We provide high-quality music education for students of all ages and skill levels in an inspiring, supportive environment.",
    foundersTitle: "Founders & Owners",
    founderRole: "Founder & Owner",
    coursesTitle: "Courses",
    whyChooseUsTitle: "Why Choose Us",
    successTitle: "Student Success",
    galleryTitle: "Gallery",
    testimonialsTitle: "Testimonials",
    registrationTitle: "Student Registration",
    registrationSubtitle: "Submit your details and we will contact you shortly.",
    faqTitle: "Frequently Asked Questions",
    contactTitle: "Contact",
    language: "Language",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    successMessage: "Thank you for registering with Glory Music Center. We will contact you shortly.",
    form: { fullName: "Full Name", age: "Age", gender: "Gender", phone: "Phone Number", parent: "Parent/Guardian Name", email: "Email", course: "Course Selection", schedule: "Preferred Schedule", message: "Message", submit: "Submit Registration", required: "This field is required." },
    genders: { male: "Male", female: "Female", other: "Other" },
    schedules: { morning: "Weekday Morning", afternoon: "Weekday Afternoon", weekend: "Weekend" },
    courses: { piano: "Piano", keyboard: "Keyboard", guitar: "Guitar", saxophone: "Saxophone", vocal: "Vocal" },
    filters: { all: "All", piano: "Piano Classes", guitar: "Guitar Classes", keyboard: "Keyboard Sessions", saxophone: "Saxophone Lessons", vocal: "Vocal Classes", performances: "Student Performances", events: "Music Events" },
    mapTitle: "Find Us in Bale Robe",
    addressLabel: "Address",
    callNow: "Call Now",
    whatsapp: "WhatsApp",
    sendEmail: "Send Email",
    footerRights: "© 2026 Glory Music Center. All Rights Reserved.",
  },
  am: {
    brandName: "Glory Music Center",
    tagline: "የሙዚቃ ብቃትዎን ይክፈቱ",
    nav: { home: "ዋና ገጽ", about: "ስለ እኛ", courses: "ኮርሶች", gallery: "ጋለሪ", testimonials: "ምስክርነቶች", registration: "ምዝገባ", faq: "ተደጋጋሚ ጥያቄዎች", contact: "አድራሻ" },
    heroTitle: "የሙዚቃ ብቃትዎን ይክፈቱ",
    heroSubtitle: "ለህፃናት፣ ለወጣቶች እና ለአዋቂዎች የፒያኖ፣ ኪቦርድ፣ ጊታር እና ሳክሶፎን ሙያዊ ስልጠና።",
    registerNow: "አሁን ይመዝገቡ",
    exploreCourses: "ኮርሶችን ይመልከቱ",
    aboutTitle: "ስለ Glory Music Center",
    aboutBody1: "Glory Music Center የሙዚቃ ብቃትን በሙያዊ አስተምህሮ፣ በፈጠራ፣ በትጋት እና በከፍተኛ የመድረክ ብቃት ለማበልጸግ የተቋቋመ ነው።",
    aboutBody2: "ለሁሉም ዕድሜ እና የብቃት ደረጃ ተማሪዎች ከፍተኛ ጥራት ያለው የሙዚቃ ትምህርት እንሰጣለን።",
    foundersTitle: "መስራቾች እና ባለቤቶች",
    founderRole: "መስራች እና ባለቤት",
    coursesTitle: "ኮርሶች",
    whyChooseUsTitle: "ለምን እኛ",
    successTitle: "የተማሪ ስኬት",
    galleryTitle: "ጋለሪ",
    testimonialsTitle: "የተማሪ አስተያየቶች",
    registrationTitle: "የተማሪ ምዝገባ",
    registrationSubtitle: "መረጃዎን ይሙሉ፣ በቅርቡ እንገናኝዎታለን።",
    faqTitle: "ተደጋጋሚ ጥያቄዎች",
    contactTitle: "አድራሻ",
    language: "ቋንቋ",
    lightMode: "ብርሃን ሁኔታ",
    darkMode: "ጨለማ ሁኔታ",
    successMessage: "ከGlory Music Center ጋር ስለተመዘገቡ እናመሰግናለን። በቅርቡ እንገናኝዎታለን።",
    form: { fullName: "ሙሉ ስም", age: "ዕድሜ", gender: "ፆታ", phone: "ስልክ ቁጥር", parent: "የወላጅ/አሳዳጊ ስም", email: "ኢሜይል", course: "የሚመረጠው ኮርስ", schedule: "የተመረጠ ሰዓት", message: "መልዕክት", submit: "ምዝገባን ይላኩ", required: "ይህ መስክ አስፈላጊ ነው።" },
    genders: { male: "ወንድ", female: "ሴት", other: "ሌላ" },
    schedules: { morning: "የሳምንት ጠዋት", afternoon: "የሳምንት ከሰዓት", weekend: "የሳምንት መጨረሻ" },
    courses: { piano: "ፒያኖ", keyboard: "ኪቦርድ", guitar: "ጊታር", saxophone: "ሳክሶፎን", vocal: "ድምፅ" },
    filters: { all: "ሁሉም", piano: "የፒያኖ ክፍሎች", guitar: "የጊታር ክፍሎች", keyboard: "የኪቦርድ ስልጠና", saxophone: "የሳክሶፎን ትምህርት", vocal: "የድምፅ ክፍሎች", performances: "የተማሪ ትርኢቶች", events: "የሙዚቃ ዝግጅቶች" },
    mapTitle: "በባሌ ሮቤ ያግኙን",
    addressLabel: "አድራሻ",
    callNow: "አሁን ይደውሉ",
    whatsapp: "ዋትስአፕ",
    sendEmail: "ኢሜይል ይላኩ",
    footerRights: "© 2026 Glory Music Center. መብቱ በሙሉ የተጠበቀ ነው።",
  },
  om: {
    brandName: "Glory Music Center",
    tagline: "Dandeettii Muuziqaa Kee Bani",
    nav: { home: "Mana", about: "Waa'ee Keenya", courses: "Koorsiiwwan", gallery: "Gaalarii", testimonials: "Ragaa", registration: "Galmee", faq: "Gaaffiiwwan", contact: "Qunnamtii" },
    heroTitle: "Dandeettii Muuziqaa Kee Bani",
    heroSubtitle: "Leenjii piyaanoo, kiiboordii, gitaaraa fi saaksoofoonii ogummaa daa'imman, dargaggootaa fi ga'eessotaaf.",
    registerNow: "Amma Galmaa'i",
    exploreCourses: "Koorsii Ilaali",
    aboutTitle: "Waa'ee Glory Music Center",
    aboutBody1: "Glory Music Center dandeettii muuziqaa barsiisa ogummaa, kalaqa, sirna hojii fi ga'umsa agarsiisaatiin guddisuuf hojii irra jira.",
    aboutBody2: "Barattoota umurii fi sadarkaa hundaaf barnoota muuziqaa qulqullina olaanaa qabu ni kennina.",
    foundersTitle: "Hundeeffitootaa fi Abbootii Qabeenyaa",
    founderRole: "Hundeeffataa fi Abbaa Qabeenyaa",
    coursesTitle: "Koorsiiwwan",
    whyChooseUsTitle: "Maaliif Nu Filattu",
    successTitle: "Milkaa'ina Barattootaa",
    galleryTitle: "Gaalarii",
    testimonialsTitle: "Yaada Barattootaa",
    registrationTitle: "Galmee Barataa",
    registrationSubtitle: "Odeeffannoo kee guuti; yeroo dhowwatti si qunnamna.",
    faqTitle: "Gaaffiiwwan Yeroo Baayyee Gaafataman",
    contactTitle: "Qunnamtii",
    language: "Afaan",
    lightMode: "Haala Ifaa",
    darkMode: "Haala Dukkanaa",
    successMessage: "Galatoomi. Glory Music Center waliin galmaa'uun kee milkaa'eera. Yeroo dhihootti si qunnamna.",
    form: { fullName: "Maqaa Guutuu", age: "Umrii", gender: "Saala", phone: "Lakkoofsa Bilbilaa", parent: "Maqaa Maatii/Guddisaa", email: "Imeelii", course: "Koorsii Filadhu", schedule: "Yeroo Filatame", message: "Ergaa", submit: "Galmee Ergi", required: "Dirqama guutamuu qaba." },
    genders: { male: "Dhiira", female: "Dhalaa", other: "Kan biraa" },
    schedules: { morning: "Ganama Guyyaa Hojii", afternoon: "Waaree Booda Guyyaa Hojii", weekend: "Dhuma Torbanii" },
    courses: { piano: "Piyaanoo", keyboard: "Kiiboordii", guitar: "Gitaaraa", saxophone: "Saaksoofoonii", vocal: "Sagalee" },
    filters: { all: "Hunda", piano: "Kutaa Piyaanoo", guitar: "Kutaa Gitaaraa", keyboard: "Leenjii Kiiboordii", saxophone: "Barnoota Saaksoofoonii", vocal: "Kutaa Sagalee", performances: "Agarsiisa Barattootaa", events: "Sagantaalee Muuziqaa" },
    mapTitle: "Bale Robe keessatti Nu Argadhaa",
    addressLabel: "Teessoo",
    callNow: "Amma Bilbili",
    whatsapp: "WhatsApp",
    sendEmail: "Imeelii Ergi",
    footerRights: "© 2026 Glory Music Center. Mirgi Hundi Eegameera.",
  },
};

const courses = [
  { key: "piano", icon: "🎹", bullets: ["Music Theory", "Classical Piano", "Modern Piano", "Performance Training"] },
  { key: "keyboard", icon: "⌨️", bullets: ["Chords", "Rhythm", "Accompaniment", "Improvisation"] },
  { key: "guitar", icon: "🎸", bullets: ["Acoustic Guitar", "Electric Guitar", "Fingerstyle", "Solo Techniques"] },
  { key: "saxophone", icon: "🎷", bullets: ["Breath Control", "Tone Development", "Reading Music", "Performance Skills"] },
  { key: "vocal", icon: "🎤", bullets: ["Vocal Warm-ups", "Pitch & Tone", "Breathing Technique", "Stage Performance"] },
] as const;

const reasons = [
  "Professional Instructors",
  "Flexible Scheduling",
  "Individual Attention",
  "Practical & Theory Learning",
  "Performance Opportunities",
  "Supportive Environment",
  "Modern Teaching Methods",
  "Affordable Programs",
];

const galleryItems = [
  { src: assetUrl(guitarAsset), alt: "Lucky Star acoustic guitar at Glory Music Center", category: "guitar" as GalleryCategory },
  { src: assetUrl(centerAsset), alt: "Glory Music Center training room", category: "events" as GalleryCategory },
  { src: assetUrl(keyboardAsset), alt: "Yamaha keyboard at the training center", category: "keyboard" as GalleryCategory },
  { src: assetUrl(sessionAsset), alt: "Keyboard practice area with instruments", category: "keyboard" as GalleryCategory },
  { src: assetUrl(saxAsset), alt: "Saxophone hanging inside the training center", category: "saxophone" as GalleryCategory },
  { src: assetUrl(guitarAsset), alt: "Acoustic guitar and amp at Glory Music Center", category: "performances" as GalleryCategory },
  { src: assetUrl(centerAsset), alt: "Music event area at Glory Music Center", category: "piano" as GalleryCategory },
  { src: assetUrl(centerAsset), alt: "Classroom space at Glory Music Center", category: "events" as GalleryCategory },
];

const testimonials = [
  { name: "Mekdes H.", role: "Parent", text: "The environment is inspiring and the teachers are patient. My child became more confident in performance." },
  { name: "Abel T.", role: "Keyboard Student", text: "The classes balance theory and practice beautifully. It feels serious, modern, and motivating." },
  { name: "Rahel D.", role: "Piano Student", text: "I love the quality of instruction and the way every lesson builds discipline and creativity together." },
];

const faqs = [
  ["How do I register?", "Fill out the registration form and the team will contact you to confirm the next step."],
  ["What age groups do you teach?", "We teach children, youth, and adults across beginner to advancing levels."],
  ["Do I need my own instrument?", "Having one at home is helpful, but the center also provides guided in-class learning with instruments."],
  ["Can beginners join?", "Yes. Our programs are designed for complete beginners as well as students improving existing skills."],
  ["How much are the fees?", "Fees vary by course and schedule. Submit a registration and the center will share the current options."],
];

const navIds = ["home", "about", "courses", "gallery", "testimonials", "registration", "faq", "contact"] as const;

function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategory>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const copy = content[lang];
  const submit = useServerFn(submitRegistration);

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      age: 12,
      gender: "male",
      phoneNumber: "",
      guardianName: "",
      email: "",
      course: "piano",
      preferredSchedule: "weekday-morning",
      message: "",
      language: lang,
    },
  });

  useEffect(() => {
    const savedLang = window.localStorage.getItem("glory-language") as Lang | null;
    const savedTheme = window.localStorage.getItem("glory-theme") as ThemeMode | null;
    if (savedLang && content[savedLang]) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    form.setValue("language", lang);
    window.localStorage.setItem("glory-language", lang);
    document.documentElement.lang = lang === "am" ? "am" : lang === "om" ? "om" : "en";
  }, [lang, form]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("glory-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTestimonialIndex((current) => (current + 1) % testimonials.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const listPhotosFn = useServerFn(listGalleryPhotos);
  const [uploaded, setUploaded] = useState<typeof galleryItems>([]);
  useEffect(() => {
    listPhotosFn()
      .then((photos) => setUploaded(photos.map((p) => ({ src: p.url, alt: p.caption ?? "Glory Music Center photo", category: p.category as GalleryCategory }))))
      .catch(() => {});
  }, [listPhotosFn]);

  const filteredGallery = useMemo(() => {
    const all = [...uploaded, ...galleryItems];
    if (galleryCategory === "all") return all;
    return all.filter((item) => item.category === galleryCategory);
  }, [galleryCategory, uploaded]);

  async function onSubmit(values: RegistrationInput) {
    try {
      await submit({ data: values });
      toast.success(copy.successMessage);
      form.reset({
        fullName: "",
        age: 12,
        gender: "male",
        phoneNumber: "",
        guardianName: "",
        email: "",
        course: "piano",
        preferredSchedule: "weekday-morning",
        message: "",
        language: lang,
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="section-shell glass-panel flex items-center justify-between rounded-full px-4 py-3 sm:px-6">
          <a href="#home" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary"><Music2 className="h-5 w-5" /></div>
            <div>
              <p className="font-display text-lg leading-none">Glory Music Center</p>
              <p className="text-xs text-muted-foreground">{copy.tagline}</p>
            </div>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {navIds.map((id) => <a key={id} href={`#${id}`} className="nav-pill">{copy.nav[id === "faq" ? "faq" : id === "home" ? "home" : id === "about" ? "about" : id === "courses" ? "courses" : id === "gallery" ? "gallery" : id === "testimonials" ? "testimonials" : id === "registration" ? "registration" : "contact"]}</a>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <select aria-label={copy.language} value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-full border border-border bg-card px-3 py-2 text-sm">
              <option value="en">English</option>
              <option value="am">አማርኛ</option>
              <option value="om">Afaan Oromo</option>
            </select>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
              <Sun className="h-4 w-4 text-primary" />
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Theme switcher" />
              <Moon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-lg lg:hidden">
          <div className="section-shell py-6">
            <div className="flex justify-end"><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border"><X className="h-5 w-5" /></button></div>
            <div className="mt-8 flex flex-col gap-4 text-2xl font-display">
              {navIds.map((id) => <a key={id} href={`#${id}`} onClick={() => setMobileOpen(false)}>{copy.nav[id === "faq" ? "faq" : id === "home" ? "home" : id === "about" ? "about" : id === "courses" ? "courses" : id === "gallery" ? "gallery" : id === "testimonials" ? "testimonials" : id === "registration" ? "registration" : "contact"]}</a>)}
            </div>
            <div className="mt-8 flex gap-3">
              <select aria-label={copy.language} value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="min-h-11 rounded-full border border-border bg-card px-4 text-sm">
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
                <option value="om">Afaan Oromo</option>
              </select>
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? copy.lightMode : copy.darkMode}</button>
            </div>
          </div>
        </div>
      )}

      <section id="home" className="hero-grid relative min-h-dvh pt-32">
        <div className="section-shell grid gap-10 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-28">
          <div>
            <p className="eyebrow">Bale Robe · Oromia · Ethiopia</p>
            <h1 className="mt-6 max-w-4xl text-5xl leading-tight sm:text-6xl lg:text-7xl"><span className="shimmer-text">{copy.heroTitle}</span></h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">{copy.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="min-h-12 rounded-full px-6"><a href="#registration">{copy.registerNow}</a></Button>
              <Button asChild variant="outline" size="lg" className="min-h-12 rounded-full border-primary/40 bg-card/70 px-6"><a href="#courses">{copy.exploreCourses}</a></Button>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[["100+", "Students Trained"],["5+", "Music Programs"],["100%", "Passion for Music"]].map(([value, label]) => (
                <div key={label} className="glass-panel rounded-3xl p-5">
                  <p className="font-display text-3xl text-primary">{value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="absolute -left-6 top-10 floating-note rounded-full border border-primary/30 bg-card px-4 py-2 text-sm">♪</div>
            <div className="absolute right-6 top-24 floating-note rounded-full border border-primary/30 bg-card px-4 py-2 text-sm [animation-delay:1s]">♫</div>
            <div className="absolute bottom-8 left-4 floating-note rounded-full border border-primary/30 bg-card px-4 py-2 text-sm [animation-delay:2s]">♬</div>
            <div className="glass-panel gold-ring overflow-hidden rounded-[2rem] p-3">
              <img src={assetUrl(centerAsset)} alt="Glory Music Center training center interior" className="aspect-[4/5] w-full rounded-[1.6rem] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 sm:py-28">
        <div className="section-shell grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2">
            <img src={assetUrl(gosaAsset)} alt="Gosa Alemayehu, founder and owner of Glory Music Center" className="gold-ring aspect-[4/5] w-full rounded-[2rem] object-cover" />
            <img src={assetUrl(danielAsset)} alt="Daniel Korsa, founder and owner of Glory Music Center" className="gold-ring aspect-[4/5] w-full rounded-[2rem] object-cover sm:mt-12" />
          </div>
          <div>
            <p className="eyebrow">{copy.aboutTitle}</p>
            <h2 className="section-title mt-5">A premium academy rooted in discipline, creativity, and performance.</h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.aboutBody1}</p>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">{copy.aboutBody2}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[{ name: "Gosa Alemayehu", image: assetUrl(gosaAsset) }, { name: "Daniel Korsa", image: assetUrl(danielAsset) }].map((founder) => (
                <div key={founder.name} className="glass-panel gold-ring rounded-[1.75rem] p-4">
                  <img src={founder.image} alt={founder.name} loading="lazy" className="aspect-[4/5] w-full rounded-[1.25rem] object-cover" />
                  <h3 className="mt-4 text-xl">{founder.name}</h3>
                  <p className="mt-1 text-sm text-primary">{copy.founderRole}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="courses" className="py-20 sm:py-28">
        <div className="section-shell">
          <p className="eyebrow">{copy.coursesTitle}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {courses.map((course) => (
              <article key={course.key} className="glass-panel gold-ring rounded-[1.75rem] p-6">
                <div className="text-3xl">{course.icon}</div>
                <h3 className="mt-5 text-2xl">{copy.courses[course.key]}</h3>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {course.bullets.map((bullet) => <li key={bullet}>• {bullet}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="section-shell grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">{copy.whyChooseUsTitle}</p>
            <h2 className="section-title mt-5">Elegant instruction, individual attention, and real musical growth.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reasons.map((reason) => <div key={reason} className="glass-panel rounded-3xl px-5 py-4 text-sm font-semibold text-foreground">✓ {reason}</div>)}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="section-shell grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["100+", "Students"], ["95%", "Satisfaction"], ["100+", "Performances"], ["5", "Major Programs"]].map(([value, label]) => (
            <div key={label} className="glass-panel rounded-[1.75rem] p-6 text-center">
              <div className="font-display text-5xl text-primary">{value}</div>
              <div className="mt-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="py-20 sm:py-28">
        <div className="section-shell">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">{copy.galleryTitle}</p>
              <h2 className="section-title mt-4">Inside the learning atmosphere at Glory Music Center.</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "piano", "guitar", "keyboard", "saxophone", "performances", "events"] as GalleryCategory[]).map((category) => (
                <button key={category} onClick={() => setGalleryCategory(category)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${galleryCategory === category ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}>
                  {copy.filters[category]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {filteredGallery.map((item, index) => (
              <button key={`${item.src}-${index}`} onClick={() => setLightbox(item.src)} className="mb-4 block w-full overflow-hidden rounded-[1.5rem] border border-border bg-card text-left">
                <img src={item.src} alt={item.alt} loading="lazy" className="w-full object-cover transition duration-500 hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 sm:py-28">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow">{copy.testimonialsTitle}</p>
            <h2 className="section-title mt-5">Families and students describe the center as disciplined, warm, and inspiring.</h2>
          </div>
          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex gap-1 text-primary">★★★★★</div>
            <div>
              <p className="text-xl leading-8 text-foreground">“{testimonials[testimonialIndex].text}”</p>
              <div className="mt-6">
                <p className="font-semibold">{testimonials[testimonialIndex].name}</p>
                <p className="text-sm text-muted-foreground">{testimonials[testimonialIndex].role}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="registration" className="py-20 sm:py-28">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow">{copy.registrationTitle}</p>
            <h2 className="section-title mt-5">Start your journey with a premium registration experience.</h2>
            <p className="mt-5 text-lg text-muted-foreground">{copy.registrationSubtitle}</p>
          </div>
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="fullName" render={({ field }) => <FormItem><FormLabel>{copy.form.fullName}</FormLabel><FormControl><Input {...field} className="min-h-11 rounded-2xl bg-card" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="age" render={({ field }) => <FormItem><FormLabel>{copy.form.age}</FormLabel><FormControl><Input type="number" {...field} className="min-h-11 rounded-2xl bg-card" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="gender" render={({ field }) => <FormItem><FormLabel>{copy.form.gender}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="min-h-11 rounded-2xl bg-card"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">{copy.genders.male}</SelectItem><SelectItem value="female">{copy.genders.female}</SelectItem><SelectItem value="other">{copy.genders.other}</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => <FormItem><FormLabel>{copy.form.phone}</FormLabel><FormControl><Input {...field} className="min-h-11 rounded-2xl bg-card" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="guardianName" render={({ field }) => <FormItem><FormLabel>{copy.form.parent}</FormLabel><FormControl><Input {...field} className="min-h-11 rounded-2xl bg-card" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>{copy.form.email}</FormLabel><FormControl><Input type="email" {...field} className="min-h-11 rounded-2xl bg-card" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="course" render={({ field }) => <FormItem><FormLabel>{copy.form.course}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="min-h-11 rounded-2xl bg-card"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="piano">{copy.courses.piano}</SelectItem><SelectItem value="keyboard">{copy.courses.keyboard}</SelectItem><SelectItem value="guitar">{copy.courses.guitar}</SelectItem><SelectItem value="saxophone">{copy.courses.saxophone}</SelectItem><SelectItem value="vocal">{copy.courses.vocal}</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="preferredSchedule" render={({ field }) => <FormItem><FormLabel>{copy.form.schedule}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="min-h-11 rounded-2xl bg-card"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="weekday-morning">{copy.schedules.morning}</SelectItem><SelectItem value="weekday-afternoon">{copy.schedules.afternoon}</SelectItem><SelectItem value="weekend">{copy.schedules.weekend}</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                <div className="sm:col-span-2"><FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>{copy.form.message}</FormLabel><FormControl><Textarea {...field} className="min-h-32 rounded-[1.5rem] bg-card" /></FormControl><FormMessage /></FormItem>} /></div>
                <div className="sm:col-span-2"><Button type="submit" size="lg" className="min-h-12 w-full rounded-full">{copy.form.submit}</Button></div>
              </form>
            </Form>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 sm:py-28">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">{copy.faqTitle}</p>
            <h2 className="section-title mt-5">Helpful answers for parents and students.</h2>
          </div>
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <Accordion type="single" collapsible>
              {faqs.map(([question, answer], index) => (
                <AccordionItem value={`item-${index}`} key={question}>
                  <AccordionTrigger className="text-left text-base font-semibold">{question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 sm:py-28">
        <div className="section-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">{copy.contactTitle}</p>
            <h2 className="section-title mt-5">Bale Robe Square, premium music education, warm welcome.</h2>
            <div className="mt-8 space-y-4 text-muted-foreground">
              <p><strong className="text-foreground">{copy.addressLabel}:</strong> Bale Robe, Oromia, Ethiopia</p>
              <p><strong className="text-foreground">Phone:</strong> +251 910 287 951</p>
              <p><strong className="text-foreground">Phone:</strong> +251 920 024 558</p>
              <p><strong className="text-foreground">Email:</strong> gosaalemayehu701@gmail.com</p>
              <p><strong className="text-foreground">Email:</strong> danikorsa47@gmail.com</p>
              <p><strong className="text-foreground">TikTok:</strong> <a href="https://www.tiktok.com/@glorymusic17" target="_blank" rel="noreferrer" className="hover:text-primary">@glorymusic17</a></p>
              <p><strong className="text-foreground">Telegram:</strong> <a href="https://t.me/glorymusiccenter" target="_blank" rel="noreferrer" className="hover:text-primary">t.me/glorymusiccenter</a></p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="min-h-12 rounded-full px-5"><a href="tel:+251910287951"><Phone className="h-4 w-4" />{copy.callNow}</a></Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-5"><a href="https://wa.me/251910287951" target="_blank" rel="noreferrer">{copy.whatsapp}</a></Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-5"><a href="mailto:gosaalemayehu701@gmail.com"><Send className="h-4 w-4" />{copy.sendEmail}</a></Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-5"><a href="https://www.tiktok.com/@glorymusic17" target="_blank" rel="noreferrer">TikTok</a></Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-5"><a href="https://t.me/glorymusiccenter" target="_blank" rel="noreferrer">Telegram</a></Button>
            </div>
          </div>
          <div className="glass-panel overflow-hidden rounded-[2rem] p-3">
            <iframe title="Bale Robe Square map" src="https://www.google.com/maps?q=Bale%20Robe%20Square%2C%20Bale%20Robe%2C%20Ethiopia&output=embed" loading="lazy" className="h-[420px] w-full rounded-[1.5rem] border-0" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 py-10">
        <div className="section-shell flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-display text-2xl">Glory Music Center</p>
              <p className="mt-2 text-sm text-muted-foreground">{copy.footerRights}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <a href="#about">{copy.nav.about}</a>
              <a href="#courses">{copy.nav.courses}</a>
              <a href="#gallery">{copy.nav.gallery}</a>
              <a href="#contact">{copy.nav.contact}</a>
              <a href="/admin" className="hover:text-primary">Admin</a>
            </div>
          </div>
          <div className="border-t border-border/60 pt-5 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Developed by <span className="text-primary">Hundaf Digital Solution</span>
          </div>
        </div>
      </footer>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-4xl border-border bg-background/95 p-3 sm:p-4">
          {lightbox ? <img src={lightbox} alt="Expanded gallery image" className="w-full rounded-2xl object-cover" /> : null}
        </DialogContent>
      </Dialog>
      <ImageHealthCheck
        urls={[
          assetUrl(centerAsset),
          assetUrl(gosaAsset),
          assetUrl(danielAsset),
          assetUrl(keyboardAsset),
          assetUrl(sessionAsset),
          assetUrl(saxAsset),
          assetUrl(guitarAsset),
          ...galleryItems.map((g) => g.src),
        ]}
      />
    </main>
  );
}
