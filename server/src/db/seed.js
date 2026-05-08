// Seed the database with the same catalog the inline app shipped with.
// Idempotent — running again is safe (uses INSERT OR REPLACE).
import 'dotenv/config';
import db from './index.js';

const featured = [
  { id:'b1', title:"Gray's Anatomy for Students", author:'Richard Drake', edition:'4th Ed', mrp:1895, price:1499, rating:4.8, reviews:2847, cover:{bg:'#1f3a5f',accent:'#c89d4a',style:'classic'}, tag:'Bestseller', category:'MBBS', stock:24, publisher:'Elsevier', isbn:'9780323393041', pages:1188, language:'English', description:"The most trusted anatomy resource for medical students. Drake's clear writing, full-color illustrations and clinical correlations make complex anatomy easy to learn." },
  { id:'b2', title:'Robbins Basic Pathology', author:'Vinay Kumar', edition:'11th Ed', mrp:2295, price:1799, rating:4.9, reviews:4112, cover:{bg:'#7a1e2b',accent:'#f0d8a0',style:'medical'}, tag:'New Edition', category:'MBBS', stock:18, publisher:'Elsevier', isbn:'9780323790185', pages:952, description:'Robbins Basic Pathology delivers the pathology knowledge you need, the way you need it.' },
  { id:'b3', title:"Ganong's Review of Medical Physiology", author:'Kim E. Barrett', edition:'26th Ed', mrp:1650, price:1295, rating:4.7, reviews:1893, cover:{bg:'#2a5d3f',accent:'#e8e0c8',style:'classic'}, category:'MBBS', stock:31, publisher:'McGraw Hill', isbn:'9781260122404', pages:752, description:'Concise, current, beautifully illustrated review of human physiology.' },
  { id:'b4', title:"Harrison's Principles of Internal Medicine", author:'J. Larry Jameson', edition:'21st Ed', mrp:12500, price:9750, rating:4.9, reviews:956, cover:{bg:'#0e2a47',accent:'#d4a64a',style:'tome'}, tag:'2 Vol Set', category:'MD/MS', stock:6, publisher:'McGraw Hill', isbn:'9781264268504', pages:4400, description:"Harrison's Principles of Internal Medicine is the world's most authoritative reference for internal medicine." },
  { id:'b5', title:"BD Chaurasia's Human Anatomy", author:'B.D. Chaurasia', edition:'9th Ed · Vol 1', mrp:895, price:695, rating:4.8, reviews:6204, cover:{bg:'#a83232',accent:'#f5e8c8',style:'india'}, tag:'Top Pick', category:'MBBS', stock:47, publisher:'CBS', isbn:'9788123923321', pages:432, description:"BD Chaurasia's Human Anatomy Vol 1 — most popular anatomy textbook in Indian medical colleges." },
  { id:'b6', title:"Park's Textbook of Preventive & Social Medicine", author:'K. Park', edition:'27th Ed', mrp:1495, price:1175, rating:4.7, reviews:3401, cover:{bg:'#3d2a5c',accent:'#e0c878',style:'india'}, category:'MBBS', stock:22, publisher:'Banarsidas Bhanot', isbn:'9789391734411', pages:1010, description:"Park's PSM is the standard Indian MBBS PSM text." },
  { id:'b7', title:"Snell's Clinical Anatomy by Regions", author:'Lawrence E. Wineski', edition:'10th Ed', mrp:1395, price:1095, rating:4.6, reviews:1287, cover:{bg:'#0d4f5c',accent:'#f0d4a0',style:'classic'}, category:'MBBS', stock:14, publisher:'Wolters Kluwer', isbn:'9781975139612', pages:712, description:"Snell's Clinical Anatomy presents anatomy with clinical relevance." },
  { id:'b8', title:"Bailey & Love's Short Practice of Surgery", author:'Norman S. Williams', edition:'28th Ed', mrp:3495, price:2795, rating:4.8, reviews:1654, cover:{bg:'#5c1f1f',accent:'#e8c878',style:'tome'}, category:'MD/MS', stock:9, publisher:'CRC Press', isbn:'9781032124230', pages:1696, description:"Bailey & Love's — definitive surgical reference for over 90 years." },
];

const newArrivals = [
  { id:'n1', title:'Lippincott Illustrated Reviews: Biochemistry', author:'Emine E. Abali', edition:'8th Ed', mrp:1195, price:945, rating:4.7, reviews:412, cover:{bg:'#c44569',accent:'#fff5e1',style:'lippincott'}, tag:'Just In', category:'MBBS', stock:28, publisher:'Wolters Kluwer', isbn:'9781975155100', pages:568, description:'Lippincott Illustrated Reviews: Biochemistry — bullet-point text, hundreds of figures.' },
  { id:'n2', title:"Davidson's Principles & Practice of Medicine", author:'Stuart Ralston', edition:'24th Ed', mrp:2895, price:2295, rating:4.9, reviews:287, cover:{bg:'#1e4a6e',accent:'#e8d4a0',style:'tome'}, tag:'Just In', category:'MD/MS', stock:11, publisher:'Elsevier', isbn:'9780702083471', pages:1440, description:"Davidson's is the definitive textbook of internal medicine." },
  { id:'n3', title:"Kaplan & Sadock's Synopsis of Psychiatry", author:'Robert Boland', edition:'12th Ed', mrp:2495, price:1995, rating:4.6, reviews:198, cover:{bg:'#4a3868',accent:'#f0e0c8',style:'classic'}, category:'MD/MS', stock:8, publisher:'Wolters Kluwer', isbn:'9781975145569', pages:944, description:"Kaplan & Sadock's Synopsis of Psychiatry — must-have psychiatric textbook." },
  { id:'n4', title:"Dr. Bhatia's NEET-PG Notes — Medicine", author:'Dr. Aditya Bhatia', edition:'2026 Ed', mrp:1295, price:999, rating:4.8, reviews:521, cover:{bg:'#e07a3f',accent:'#0a1628',style:'india'}, tag:'Just In', category:'NEET-PG', stock:56, publisher:'Bhatia Medical Coaching', isbn:'9788195482115', pages:612, description:'Concise high-yield notes for NEET-PG Medicine.' },
  { id:'n5', title:"Marriott's Practical Electrocardiography", author:'David G. Strauss', edition:'13th Ed', mrp:1895, price:1525, rating:4.7, reviews:167, cover:{bg:'#143d2e',accent:'#e0c878',style:'classic'}, category:'MD/MS', stock:13, publisher:'Wolters Kluwer', isbn:'9781975190514', pages:528, description:"Marriott's Practical Electrocardiography — leading reference for ECG interpretation." },
  { id:'n6', title:"Tara Shanbhag's Pharmacology", author:'Tara V. Shanbhag', edition:'4th Ed', mrp:795, price:625, rating:4.7, reviews:943, cover:{bg:'#7a4a1e',accent:'#fff0d0',style:'india'}, category:'MBBS', stock:38, publisher:'Elsevier', isbn:'9788131264942', pages:568, description:"Tara Shanbhag's Pharmacology — popular pharma textbook in Indian colleges." },
  { id:'n7', title:"Schwartz's Principles of Surgery", author:'F. Charles Brunicardi', edition:'12th Ed', mrp:4495, price:3595, rating:4.8, reviews:234, cover:{bg:'#5c3318',accent:'#e8d4a0',style:'tome'}, category:'MD/MS', stock:7, publisher:'McGraw Hill', isbn:'9781260468885', pages:2256, description:"Schwartz's Principles of Surgery — leading reference in modern surgical practice." },
  { id:'n8', title:'Nelson Textbook of Pediatrics', author:'Robert M. Kliegman', edition:'22nd Ed', mrp:5995, price:4795, rating:4.9, reviews:312, cover:{bg:'#1a5c5c',accent:'#f0d4a0',style:'tome'}, category:'BDS', stock:4, publisher:'Elsevier', isbn:'9780323883054', pages:4264, description:"Nelson Textbook of Pediatrics — world's most trusted pediatric reference." },
];

const forthcoming = [
  { id:'f1', title:"Brenner & Rector's The Kidney", author:'Karl Skorecki', edition:'12th Ed · 2026', mrp:18950, price:14999, rating:4.9, reviews:12, cover:{bg:'#1a3a52',accent:'#d4a64a',style:'tome'}, arrival_date:'15 June 2026', category:'MD/MS', stock:0, publisher:'Elsevier', isbn:'9780323882521', pages:2424, description:"World's most authoritative reference on nephrology, fully updated for 2026." },
  { id:'f2', title:'Clinical Gastroenterology', author:'Norton Greenberger', edition:'5th Ed · 2026', mrp:5495, price:4395, rating:4.8, reviews:8, cover:{bg:'#2a4a1e',accent:'#e8d4a0',style:'classic'}, arrival_date:'22 May 2026', category:'MD/MS', stock:0, publisher:'McGraw Hill', isbn:'9781265142773', pages:768, description:'Practical case-based approach to gastroenterology.' },
  { id:'f3', title:'Williams Obstetrics', author:'F. Gary Cunningham', edition:'27th Ed · 2026', mrp:4995, price:3995, rating:4.9, reviews:5, cover:{bg:'#5c1f3f',accent:'#f0d4a0',style:'tome'}, arrival_date:'10 July 2026', category:'MD/MS', stock:0, publisher:'McGraw Hill', isbn:'9781265454258', pages:1376, description:'Definitive obstetrics text trusted by generations of OB/GYNs.' },
  { id:'f4', title:"Kumar & Clark's Clinical Medicine", author:'Adam Feather', edition:'11th Ed · 2026', mrp:3495, price:2795, rating:4.7, reviews:4, cover:{bg:'#0a3d4a',accent:'#e0c878',style:'classic'}, arrival_date:'03 June 2026', category:'MD/MS', stock:0, publisher:'Elsevier', isbn:'9780702083488', pages:1456, description:'Bestselling clinical medicine textbook, fully updated.' },
];

const secondhand = [
  { id:'s1', title:"Gray's Anatomy for Students", author:'Richard Drake', edition:'4th Ed', mrp:1899, price:749, original_price:1499, rating:4.8, reviews:2847, cover:{bg:'#1f3a5f',accent:'#c89d4a',style:'classic'}, condition:'Like New', condition_score:9, seller:'Aakash M., AIIMS Delhi', seller_year:'4th-year MBBS', notes:'Bought new last year. Used for 8 months. No highlighting.', category:'MBBS', stock:1 },
  { id:'s2', title:'Robbins Basic Pathology', author:'Vinay Kumar', edition:'11th Ed', mrp:2295, price:1199, original_price:1799, rating:4.9, reviews:4112, cover:{bg:'#7a1e2b',accent:'#f0d8a0',style:'medical'}, condition:'Good', condition_score:7, seller:'Priya S., JIPMER', seller_year:'3rd-year MBBS', notes:'Some highlighting in chapters 1-12. Spine tight.', category:'MBBS', stock:1 },
  { id:'s3', title:"BD Chaurasia's Human Anatomy", author:'B.D. Chaurasia', edition:'9th Ed · Vol 1', mrp:895, price:349, original_price:695, rating:4.8, reviews:6204, cover:{bg:'#a83232',accent:'#f5e8c8',style:'india'}, condition:'Good', condition_score:8, seller:'Rohit K., KGMU', seller_year:'2nd-year MBBS', notes:'Light pencil marks in some diagrams.', category:'MBBS', stock:1 },
  { id:'s4', title:"Park's Textbook of PSM", author:'K. Park', edition:'26th Ed', mrp:1495, price:599, original_price:1175, rating:4.7, reviews:3401, cover:{bg:'#3d2a5c',accent:'#e0c878',style:'india'}, condition:'Acceptable', condition_score:6, seller:'Sanchita R., BHU', seller_year:'4th-year MBBS', notes:'Highlighting throughout. One previous edition behind current.', category:'MBBS', stock:1 },
];

const bundles = [
  { id:'bun1', title:'MBBS Year 1 Complete Bundle', subtitle:'Anatomy, Physiology, Biochemistry — first year essentials', badge:'Save 15%', accent:'amber', books:["BD Chaurasia's Human Anatomy (3 Vols)","Ganong's Review of Medical Physiology","Lippincott Biochemistry","Inderbir Singh's Embryology","Vishram Singh's Neuroanatomy"], mrp:6850, price:5499, saved:1351 },
  { id:'bun2', title:'Surgery Essentials Pack', subtitle:'For final year & house surgeons', badge:'Save 22%', accent:'teal', books:["Bailey & Love's Short Practice of Surgery","SRB's Manual of Surgery","Schwartz's Principles of Surgery","Norton's Surgery"], mrp:11800, price:8995, saved:2805 },
  { id:'bun3', title:'NEET-PG Final Sprint', subtitle:'High-yield review across all 19 subjects', badge:'Save 18%', accent:'navy', books:['Marrow NEET-PG Notes (Set of 19)','DAMS Color Atlas',"Dr. Bhatia's NEET-PG Quick Review","Last 10 Years' Solved Papers"], mrp:8400, price:6895, saved:1505 },
];

const testimonials = [
  { name:'Dr. Aakash Mehta', role:'AIIMS Delhi · MBBS Year 4', source:'Google', rating:5, date:'12 days ago', text:'Ordered Robbins and Bailey & Love. Both arrived in 2 days, sealed and original. Will definitely order all my surgery prep books from here.' },
  { name:'Priya Sharma', role:'JIPMER · MBBS Year 2', source:'WhatsApp', rating:5, date:'3 weeks ago', text:'I was confused about which biochemistry book to buy. The MedShelf AI suggested Lippincott + Vasudevan combo — exactly what my seniors recommended later.' },
  { name:'Dr. Rohit Krishnan', role:'KGMU Lucknow · MD Pediatrics', source:'Google', rating:5, date:'1 month ago', text:'Bought the Nelson Pediatrics 22nd edition for residency. Genuine print, perfect condition. Customer support replied to my WhatsApp query in under an hour.' },
  { name:'Sanchita Roy', role:'BHU · BDS Year 3', source:'Google', rating:4, date:'2 months ago', text:'Great selection of dental books which is rare in Indian online stores. They proactively informed me of a delay and gave a ₹100 store credit.' },
  { name:'Dr. Vivek Iyer', role:'NEET-PG 2026 aspirant', source:'WhatsApp', rating:5, date:'5 days ago', text:'The NEET-PG Final Sprint bundle saved me 18% over buying separately. Dispatched same day from Bangalore — got it in Pune in 2 days.' },
  { name:'Anjali Nair', role:'Manipal · Nursing', source:'Google', rating:5, date:'3 weeks ago', text:'Affordable prices and they actually have nursing textbooks (not just MBBS). COD worked smoothly. Recommended to my whole batch.' },
];

const insertBook = db.prepare(`
  INSERT OR REPLACE INTO books
    (id, title, author, edition, mrp, price, rating, reviews,
     cover_bg, cover_accent, cover_style, tag, category, stock,
     publisher, isbn, pages, language, description, arrival_date,
     is_used, condition, condition_score, seller, seller_year, notes,
     original_price, shelf)
  VALUES
    (@id, @title, @author, @edition, @mrp, @price, @rating, @reviews,
     @cover_bg, @cover_accent, @cover_style, @tag, @category, @stock,
     @publisher, @isbn, @pages, @language, @description, @arrival_date,
     @is_used, @condition, @condition_score, @seller, @seller_year, @notes,
     @original_price, @shelf)
`);
const insertBundle = db.prepare(`
  INSERT OR REPLACE INTO bundles (id, title, subtitle, badge, accent, books_json, mrp, price, saved)
  VALUES (@id, @title, @subtitle, @badge, @accent, @books_json, @mrp, @price, @saved)
`);
const insertTestimonial = db.prepare(`
  INSERT INTO testimonials (name, role, source, rating, date, text)
  VALUES (@name, @role, @source, @rating, @date, @text)
`);

function bookRow(b, shelf) {
  return {
    id: b.id, title: b.title, author: b.author, edition: b.edition || null,
    mrp: b.mrp, price: b.price, rating: b.rating, reviews: b.reviews,
    cover_bg: b.cover.bg, cover_accent: b.cover.accent, cover_style: b.cover.style,
    tag: b.tag || null, category: b.category || null, stock: b.stock ?? 0,
    publisher: b.publisher || null, isbn: b.isbn || null, pages: b.pages || null,
    language: b.language || 'English', description: b.description || null,
    arrival_date: b.arrival_date || null,
    is_used: shelf === 'secondhand' ? 1 : 0,
    condition: b.condition || null, condition_score: b.condition_score || null,
    seller: b.seller || null, seller_year: b.seller_year || null, notes: b.notes || null,
    original_price: b.original_price || null,
    shelf,
  };
}

const tx = db.transaction(() => {
  // Wipe testimonials only (since the table has no PK to dedup on)
  db.exec('DELETE FROM testimonials;');
  featured.forEach(b => insertBook.run(bookRow(b, 'featured')));
  newArrivals.forEach(b => insertBook.run(bookRow(b, 'new')));
  forthcoming.forEach(b => insertBook.run(bookRow(b, 'forthcoming')));
  secondhand.forEach(b => insertBook.run(bookRow(b, 'secondhand')));
  bundles.forEach(b => insertBundle.run({
    id: b.id, title: b.title, subtitle: b.subtitle, badge: b.badge, accent: b.accent,
    books_json: JSON.stringify(b.books), mrp: b.mrp, price: b.price, saved: b.saved,
  }));
  testimonials.forEach(t => insertTestimonial.run(t));
});
tx();

const counts = {
  books: db.prepare('SELECT COUNT(*) AS n FROM books').get().n,
  bundles: db.prepare('SELECT COUNT(*) AS n FROM bundles').get().n,
  testimonials: db.prepare('SELECT COUNT(*) AS n FROM testimonials').get().n,
};
console.log('Seeded:', counts);
