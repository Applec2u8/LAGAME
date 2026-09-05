import { useState, useRef, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  Cpu, Zap, MemoryStick, ChevronDown, X, Search, Loader2,
  CheckCircle, AlertTriangle, XCircle, Gauge, Settings2, Lightbulb,
  Monitor, Languages, TrendingUp
} from 'lucide-react'
import { generateGameData } from '../../lib/gemini'
import type { Game } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'

// ══════════════════════════════════════════════════════════════
//  STATIC HARDWARE LISTS  (CPU ~450+, GPU ~350+, RAM ~60)
// ══════════════════════════════════════════════════════════════

const CPU_LIST: string[] = [
  // Intel Core Ultra (Meteor Lake / Arrow Lake)
  'Intel Core Ultra 9 285K', 'Intel Core Ultra 7 265K', 'Intel Core Ultra 5 245K',
  'Intel Core Ultra 9 285HX', 'Intel Core Ultra 7 265H', 'Intel Core Ultra 5 225H',
  'Intel Core Ultra 7 258V', 'Intel Core Ultra 5 226V',
  // Intel 14th Gen
  'Intel Core i9-14900KS', 'Intel Core i9-14900K', 'Intel Core i9-14900KF', 'Intel Core i9-14900F',
  'Intel Core i7-14700K', 'Intel Core i7-14700KF', 'Intel Core i7-14700F', 'Intel Core i7-14700',
  'Intel Core i5-14600K', 'Intel Core i5-14600KF', 'Intel Core i5-14500', 'Intel Core i5-14490F',
  'Intel Core i5-14400', 'Intel Core i5-14400F', 'Intel Core i3-14100', 'Intel Core i3-14100F',
  // Intel 13th Gen
  'Intel Core i9-13900KS', 'Intel Core i9-13900K', 'Intel Core i9-13900KF', 'Intel Core i9-13900F',
  'Intel Core i7-13700K', 'Intel Core i7-13700KF', 'Intel Core i7-13700F', 'Intel Core i7-13700',
  'Intel Core i5-13600K', 'Intel Core i5-13600KF', 'Intel Core i5-13500', 'Intel Core i5-13490F',
  'Intel Core i5-13400', 'Intel Core i5-13400F', 'Intel Core i3-13100', 'Intel Core i3-13100F',
  // Intel 12th Gen (Alder Lake)
  'Intel Core i9-12900KS', 'Intel Core i9-12900K', 'Intel Core i9-12900KF', 'Intel Core i9-12900F',
  'Intel Core i7-12700K', 'Intel Core i7-12700KF', 'Intel Core i7-12700F', 'Intel Core i7-12700',
  'Intel Core i5-12600K', 'Intel Core i5-12600KF', 'Intel Core i5-12500', 'Intel Core i5-12490F',
  'Intel Core i5-12400', 'Intel Core i5-12400F', 'Intel Core i3-12300', 'Intel Core i3-12100', 'Intel Core i3-12100F',
  // Intel 11th Gen (Rocket Lake)
  'Intel Core i9-11900K', 'Intel Core i9-11900KF', 'Intel Core i9-11900F',
  'Intel Core i7-11700K', 'Intel Core i7-11700KF', 'Intel Core i7-11700F', 'Intel Core i7-11700',
  'Intel Core i5-11600K', 'Intel Core i5-11600KF', 'Intel Core i5-11500', 'Intel Core i5-11490F',
  'Intel Core i5-11400', 'Intel Core i5-11400F', 'Intel Core i3-11100',
  // Intel 10th Gen (Comet Lake)
  'Intel Core i9-10900K', 'Intel Core i9-10900KF', 'Intel Core i9-10900F',
  'Intel Core i7-10700K', 'Intel Core i7-10700KF', 'Intel Core i7-10700F', 'Intel Core i7-10700',
  'Intel Core i5-10600K', 'Intel Core i5-10600KF', 'Intel Core i5-10500', 'Intel Core i5-10490F',
  'Intel Core i5-10400', 'Intel Core i5-10400F', 'Intel Core i3-10300', 'Intel Core i3-10100', 'Intel Core i3-10100F',
  // Intel 9th Gen (Coffee Lake Refresh)
  'Intel Core i9-9900KS', 'Intel Core i9-9900K', 'Intel Core i9-9900KF',
  'Intel Core i7-9700K', 'Intel Core i7-9700KF', 'Intel Core i7-9700',
  'Intel Core i5-9600K', 'Intel Core i5-9600KF', 'Intel Core i5-9500', 'Intel Core i5-9490F',
  'Intel Core i5-9400', 'Intel Core i5-9400F', 'Intel Core i3-9300', 'Intel Core i3-9100', 'Intel Core i3-9100F',
  // Intel 8th Gen (Coffee Lake)
  'Intel Core i7-8700K', 'Intel Core i7-8700', 'Intel Core i5-8600K', 'Intel Core i5-8500',
  'Intel Core i5-8400', 'Intel Core i3-8350K', 'Intel Core i3-8100', 'Intel Core i3-8100F',
  // Intel 7th Gen (Kaby Lake)
  'Intel Core i7-7700K', 'Intel Core i7-7700', 'Intel Core i5-7600K', 'Intel Core i5-7600',
  'Intel Core i5-7500', 'Intel Core i5-7400', 'Intel Core i3-7350K', 'Intel Core i3-7100',
  // Intel 6th Gen (Skylake)
  'Intel Core i7-6700K', 'Intel Core i7-6700', 'Intel Core i5-6600K', 'Intel Core i5-6600',
  'Intel Core i5-6500', 'Intel Core i5-6400', 'Intel Core i3-6300', 'Intel Core i3-6100',
  // Intel 5th Gen (Broadwell)
  'Intel Core i7-5775C', 'Intel Core i5-5675C',
  // Intel 4th Gen (Haswell)
  'Intel Core i7-4790K', 'Intel Core i7-4790', 'Intel Core i7-4770K', 'Intel Core i7-4770',
  'Intel Core i5-4690K', 'Intel Core i5-4690', 'Intel Core i5-4670K', 'Intel Core i5-4670',
  'Intel Core i5-4590', 'Intel Core i5-4570', 'Intel Core i5-4460', 'Intel Core i5-4440',
  'Intel Core i5-4430', 'Intel Core i3-4370', 'Intel Core i3-4160', 'Intel Core i3-4150', 'Intel Core i3-4130',
  // Intel 3rd Gen (Ivy Bridge)
  'Intel Core i7-3770K', 'Intel Core i7-3770', 'Intel Core i5-3570K', 'Intel Core i5-3570',
  'Intel Core i5-3550', 'Intel Core i5-3470', 'Intel Core i5-3450', 'Intel Core i3-3240', 'Intel Core i3-3220',
  // Intel 2nd Gen (Sandy Bridge)
  'Intel Core i7-2600K', 'Intel Core i7-2600', 'Intel Core i5-2500K', 'Intel Core i5-2500',
  'Intel Core i5-2400', 'Intel Core i5-2380P', 'Intel Core i5-2300', 'Intel Core i3-2120', 'Intel Core i3-2100',
  // Intel 1st Gen (Nehalem/Westmere)
  'Intel Core i7-980X', 'Intel Core i7-930', 'Intel Core i7-870', 'Intel Core i5-760', 'Intel Core i5-750',
  // Intel Core 2
  'Intel Core 2 Duo E8600', 'Intel Core 2 Duo E8500', 'Intel Core 2 Duo E8400', 'Intel Core 2 Duo E7500',
  'Intel Core 2 Quad Q9650', 'Intel Core 2 Quad Q9400', 'Intel Core 2 Quad Q8400', 'Intel Core 2 Quad Q6600',
  // Intel Pentium
  'Intel Pentium Gold G7400', 'Intel Pentium Gold G6600', 'Intel Pentium Gold G6400',
  'Intel Pentium Gold G5400', 'Intel Pentium G4560', 'Intel Pentium G3460', 'Intel Pentium G3258',
  'Intel Pentium E6300', 'Intel Pentium E5200', 'Intel Pentium 4 HT 3.0GHz',
  // Intel Celeron
  'Intel Celeron G6900', 'Intel Celeron G5920', 'Intel Celeron J4125', 'Intel Celeron N4100',
  // Intel Xeon (Workstation)
  'Intel Xeon W-2295', 'Intel Xeon E5-2699 v4', 'Intel Xeon E5-2690 v4', 'Intel Xeon E-2288G',
  // AMD Ryzen 9000 Series
  'AMD Ryzen 9 9950X3D', 'AMD Ryzen 9 9950X', 'AMD Ryzen 9 9900X', 'AMD Ryzen 7 9700X', 'AMD Ryzen 5 9600X',
  // AMD Ryzen 7000 Series
  'AMD Ryzen 9 7950X3D', 'AMD Ryzen 9 7950X', 'AMD Ryzen 9 7900X3D', 'AMD Ryzen 9 7900X', 'AMD Ryzen 9 7900',
  'AMD Ryzen 7 7800X3D', 'AMD Ryzen 7 7700X', 'AMD Ryzen 7 7700',
  'AMD Ryzen 5 7600X', 'AMD Ryzen 5 7600', 'AMD Ryzen 5 7500F', 'AMD Ryzen 3 7300X',
  // AMD Ryzen 5000 Series
  'AMD Ryzen 9 5950X', 'AMD Ryzen 9 5900X', 'AMD Ryzen 9 5900',
  'AMD Ryzen 7 5800X3D', 'AMD Ryzen 7 5800X', 'AMD Ryzen 7 5800', 'AMD Ryzen 7 5700X3D',
  'AMD Ryzen 7 5700X', 'AMD Ryzen 7 5700G',
  'AMD Ryzen 5 5600X', 'AMD Ryzen 5 5600', 'AMD Ryzen 5 5600G', 'AMD Ryzen 5 5500',
  'AMD Ryzen 3 5300G', 'AMD Ryzen 3 5100',
  // AMD Ryzen 4000 Series (Mobile & APU)
  'AMD Ryzen 7 PRO 4750U', 'AMD Ryzen 7 4800H', 'AMD Ryzen 7 4800U', 'AMD Ryzen 7 4700G', 'AMD Ryzen 7 4700U',
  'AMD Ryzen 5 PRO 4650U', 'AMD Ryzen 5 4600H', 'AMD Ryzen 5 4600U', 'AMD Ryzen 5 4600G', 'AMD Ryzen 5 4500U',
  'AMD Ryzen 3 PRO 4450U', 'AMD Ryzen 3 4300U', 'AMD Ryzen 3 4300G',
  // AMD Ryzen 3000 Series
  'AMD Ryzen 9 3950X', 'AMD Ryzen 9 3900X', 'AMD Ryzen 9 3900',
  'AMD Ryzen 7 3800X', 'AMD Ryzen 7 3700X',
  'AMD Ryzen 5 3600X', 'AMD Ryzen 5 3600', 'AMD Ryzen 5 3500X', 'AMD Ryzen 5 3500',
  'AMD Ryzen 3 3300X', 'AMD Ryzen 3 3100',
  // AMD Ryzen 2000 Series
  'AMD Ryzen 7 2700X', 'AMD Ryzen 7 2700', 'AMD Ryzen 5 2600X', 'AMD Ryzen 5 2600',
  'AMD Ryzen 5 2400G', 'AMD Ryzen 3 2200G',
  // AMD Ryzen 1000 Series
  'AMD Ryzen 7 1800X', 'AMD Ryzen 7 1700X', 'AMD Ryzen 7 1700',
  'AMD Ryzen 5 1600X', 'AMD Ryzen 5 1600', 'AMD Ryzen 5 1500X', 'AMD Ryzen 5 1400',
  'AMD Ryzen 3 1300X', 'AMD Ryzen 3 1200',
  // AMD FX Series
  'AMD FX-9590', 'AMD FX-9370', 'AMD FX-8370', 'AMD FX-8350', 'AMD FX-8320', 'AMD FX-8300',
  'AMD FX-8150', 'AMD FX-8120', 'AMD FX-6350', 'AMD FX-6300', 'AMD FX-6200',
  'AMD FX-4350', 'AMD FX-4300', 'AMD FX-4170',
  // AMD Phenom II
  'AMD Phenom II X6 1100T', 'AMD Phenom II X6 1055T',
  'AMD Phenom II X4 965', 'AMD Phenom II X4 955', 'AMD Phenom II X4 945',
  // AMD Athlon
  'AMD Athlon 3000G', 'AMD Athlon 200GE', 'AMD Athlon 3150G',
  // Mobile CPUs
  'AMD Ryzen 9 7945HX', 'AMD Ryzen 7 7745HX', 'AMD Ryzen 5 7645HX',
  'AMD Ryzen 9 6900HX', 'AMD Ryzen 7 6800H', 'AMD Ryzen 5 6600H',
  'Intel Core i9-14900HX', 'Intel Core i7-14700HX', 'Intel Core i5-14500HX',
  'Intel Core i9-13980HX', 'Intel Core i7-13700H', 'Intel Core i5-13500H',
  'Intel Core i7-12700H', 'Intel Core i5-12500H',
  'Apple M4 Pro', 'Apple M4', 'Apple M3 Max', 'Apple M3 Pro', 'Apple M3',
  'Apple M2 Ultra', 'Apple M2 Max', 'Apple M2 Pro', 'Apple M2',
  'Apple M1 Ultra', 'Apple M1 Max', 'Apple M1 Pro', 'Apple M1',
].sort()

const GPU_LIST: string[] = [
  // NVIDIA RTX 50 Series (Blackwell)
  'NVIDIA GeForce RTX 5090', 'NVIDIA GeForce RTX 5080',
  'NVIDIA GeForce RTX 5070 Ti', 'NVIDIA GeForce RTX 5070',
  'NVIDIA GeForce RTX 5060 Ti', 'NVIDIA GeForce RTX 5060', 'NVIDIA GeForce RTX 5050',
  // NVIDIA RTX 40 Series (Ada Lovelace)
  'NVIDIA GeForce RTX 4090', 'NVIDIA GeForce RTX 4080 Super', 'NVIDIA GeForce RTX 4080',
  'NVIDIA GeForce RTX 4070 Ti Super', 'NVIDIA GeForce RTX 4070 Ti',
  'NVIDIA GeForce RTX 4070 Super', 'NVIDIA GeForce RTX 4070',
  'NVIDIA GeForce RTX 4060 Ti 16GB', 'NVIDIA GeForce RTX 4060 Ti', 'NVIDIA GeForce RTX 4060',
  'NVIDIA GeForce RTX 4050',
  // NVIDIA RTX 30 Series (Ampere)
  'NVIDIA GeForce RTX 3090 Ti', 'NVIDIA GeForce RTX 3090',
  'NVIDIA GeForce RTX 3080 Ti', 'NVIDIA GeForce RTX 3080 12GB', 'NVIDIA GeForce RTX 3080',
  'NVIDIA GeForce RTX 3070 Ti', 'NVIDIA GeForce RTX 3070',
  'NVIDIA GeForce RTX 3060 Ti', 'NVIDIA GeForce RTX 3060 12GB', 'NVIDIA GeForce RTX 3060',
  'NVIDIA GeForce RTX 3050 8GB', 'NVIDIA GeForce RTX 3050',
  // NVIDIA RTX 20 Series (Turing)
  'NVIDIA GeForce RTX 2080 Ti', 'NVIDIA GeForce RTX 2080 Super', 'NVIDIA GeForce RTX 2080',
  'NVIDIA GeForce RTX 2070 Super', 'NVIDIA GeForce RTX 2070',
  'NVIDIA GeForce RTX 2060 Super', 'NVIDIA GeForce RTX 2060 12GB', 'NVIDIA GeForce RTX 2060',
  // NVIDIA GTX 16 Series (Turing)
  'NVIDIA GeForce GTX 1660 Ti', 'NVIDIA GeForce GTX 1660 Super', 'NVIDIA GeForce GTX 1660',
  'NVIDIA GeForce GTX 1650 Super', 'NVIDIA GeForce GTX 1650',
  // NVIDIA GTX 10 Series (Pascal)
  'NVIDIA GeForce GTX 1080 Ti', 'NVIDIA GeForce GTX 1080',
  'NVIDIA GeForce GTX 1070 Ti', 'NVIDIA GeForce GTX 1070',
  'NVIDIA GeForce GTX 1060 6GB', 'NVIDIA GeForce GTX 1060 3GB',
  'NVIDIA GeForce GTX 1050 Ti', 'NVIDIA GeForce GTX 1050 2GB',
  'NVIDIA GeForce GT 1030 2GB', 'NVIDIA GeForce GT 1030 GDDR4',
  // NVIDIA GTX 900 Series (Maxwell)
  'NVIDIA GeForce GTX 980 Ti', 'NVIDIA GeForce GTX 980',
  'NVIDIA GeForce GTX 970', 'NVIDIA GeForce GTX 960 4GB', 'NVIDIA GeForce GTX 960 2GB',
  'NVIDIA GeForce GTX 950',
  // NVIDIA GTX 700 Series (Kepler)
  'NVIDIA GeForce GTX 780 Ti', 'NVIDIA GeForce GTX 780',
  'NVIDIA GeForce GTX 770 4GB', 'NVIDIA GeForce GTX 770 2GB',
  'NVIDIA GeForce GTX 760 4GB', 'NVIDIA GeForce GTX 760 2GB',
  'NVIDIA GeForce GTX 750 Ti', 'NVIDIA GeForce GTX 750',
  // NVIDIA GTX 600 Series (Kepler)
  'NVIDIA GeForce GTX 680', 'NVIDIA GeForce GTX 670',
  'NVIDIA GeForce GTX 660 Ti', 'NVIDIA GeForce GTX 660',
  'NVIDIA GeForce GTX 650 Ti Boost', 'NVIDIA GeForce GTX 650 Ti', 'NVIDIA GeForce GTX 650',
  // NVIDIA GTX 500 Series (Fermi)
  'NVIDIA GeForce GTX 590', 'NVIDIA GeForce GTX 580',
  'NVIDIA GeForce GTX 570', 'NVIDIA GeForce GTX 560 Ti', 'NVIDIA GeForce GTX 560',
  'NVIDIA GeForce GTX 550 Ti',
  // NVIDIA GTX 400 Series (Fermi)
  'NVIDIA GeForce GTX 480', 'NVIDIA GeForce GTX 470', 'NVIDIA GeForce GTX 460 1GB',
  // NVIDIA GT Budget/Old
  'NVIDIA GeForce GT 730 4GB', 'NVIDIA GeForce GT 730 2GB',
  'NVIDIA GeForce GT 710 2GB', 'NVIDIA GeForce GT 710 1GB',
  'NVIDIA GeForce 9800 GT', 'NVIDIA GeForce 8800 GTX',
  // NVIDIA Laptop
  'NVIDIA GeForce RTX 4090 Laptop GPU', 'NVIDIA GeForce RTX 4080 Laptop GPU',
  'NVIDIA GeForce RTX 4070 Laptop GPU', 'NVIDIA GeForce RTX 4060 Laptop GPU',
  'NVIDIA GeForce RTX 4050 Laptop GPU',
  'NVIDIA GeForce RTX 3080 Ti Laptop GPU', 'NVIDIA GeForce RTX 3080 Laptop GPU',
  'NVIDIA GeForce RTX 3070 Ti Laptop GPU', 'NVIDIA GeForce RTX 3070 Laptop GPU',
  'NVIDIA GeForce RTX 3060 Laptop GPU', 'NVIDIA GeForce RTX 3050 Ti Laptop GPU',
  // AMD RX 9000 Series (RDNA 4)
  'AMD Radeon RX 9070 XT', 'AMD Radeon RX 9070', 'AMD Radeon RX 9060 XT', 'AMD Radeon RX 9060',
  // AMD RX 7000 Series (RDNA 3)
  'AMD Radeon RX 7900 XTX', 'AMD Radeon RX 7900 XT', 'AMD Radeon RX 7900 GRE',
  'AMD Radeon RX 7800 XT', 'AMD Radeon RX 7700 XT',
  'AMD Radeon RX 7600 XT', 'AMD Radeon RX 7600', 'AMD Radeon RX 7500 XT',
  // AMD RX 6000 Series (RDNA 2)
  'AMD Radeon RX 6950 XT', 'AMD Radeon RX 6900 XT', 'AMD Radeon RX 6800 XT', 'AMD Radeon RX 6800',
  'AMD Radeon RX 6750 XT', 'AMD Radeon RX 6700 XT', 'AMD Radeon RX 6700',
  'AMD Radeon RX 6650 XT', 'AMD Radeon RX 6600 XT', 'AMD Radeon RX 6600',
  'AMD Radeon RX 6500 XT 8GB', 'AMD Radeon RX 6500 XT 4GB', 'AMD Radeon RX 6400',
  // AMD RX 5000 Series (RDNA 1)
  'AMD Radeon RX 5700 XT', 'AMD Radeon RX 5700',
  'AMD Radeon RX 5600 XT', 'AMD Radeon RX 5500 XT 8GB', 'AMD Radeon RX 5500 XT 4GB',
  // AMD RX Vega
  'AMD Radeon RX Vega 64', 'AMD Radeon RX Vega 56',
  // AMD RX 500 Series (Polaris)
  'AMD Radeon RX 590', 'AMD Radeon RX 580 8GB', 'AMD Radeon RX 580 4GB',
  'AMD Radeon RX 570 8GB', 'AMD Radeon RX 570 4GB',
  'AMD Radeon RX 560 4GB', 'AMD Radeon RX 560 2GB',
  'AMD Radeon RX 550 4GB', 'AMD Radeon RX 550 2GB',
  // AMD RX 400 Series (Polaris)
  'AMD Radeon RX 480 8GB', 'AMD Radeon RX 480 4GB',
  'AMD Radeon RX 470 8GB', 'AMD Radeon RX 470 4GB',
  'AMD Radeon RX 460 4GB', 'AMD Radeon RX 460 2GB',
  // AMD R9/R7 (GCN)
  'AMD Radeon R9 Fury X', 'AMD Radeon R9 Fury', 'AMD Radeon R9 Nano',
  'AMD Radeon R9 390X', 'AMD Radeon R9 390', 'AMD Radeon R9 380X', 'AMD Radeon R9 380',
  'AMD Radeon R9 290X', 'AMD Radeon R9 290', 'AMD Radeon R9 285', 'AMD Radeon R9 270X', 'AMD Radeon R9 270',
  'AMD Radeon R7 370', 'AMD Radeon R7 265', 'AMD Radeon R7 260X',
  // AMD HD 7000 (GCN 1)
  'AMD Radeon HD 7990', 'AMD Radeon HD 7970 GHz Edition', 'AMD Radeon HD 7970',
  'AMD Radeon HD 7950', 'AMD Radeon HD 7870', 'AMD Radeon HD 7850',
  // AMD HD 6000/5000
  'AMD Radeon HD 6990', 'AMD Radeon HD 6970', 'AMD Radeon HD 6950',
  'AMD Radeon HD 6870', 'AMD Radeon HD 6850',
  'AMD Radeon HD 5870', 'AMD Radeon HD 5850', 'AMD Radeon HD 5770',
  // AMD Integrated / APU
  'AMD Radeon 890M (Ryzen AI 9 HX)', 'AMD Radeon 780M (Ryzen 7 7840U)',
  'AMD Radeon 680M (Ryzen 7 6800U)', 'AMD Radeon Vega 11 (Ryzen 5 2400G)',
  'AMD Radeon Vega 8 (Ryzen 3 2200G)',
  // Intel Arc
  'Intel Arc B580 12GB', 'Intel Arc B570 10GB',
  'Intel Arc A770 16GB', 'Intel Arc A770 8GB', 'Intel Arc A750', 'Intel Arc A580', 'Intel Arc A380',
  // Intel Integrated
  'Intel UHD Graphics 770', 'Intel UHD Graphics 750', 'Intel UHD Graphics 730',
  'Intel Iris Xe Graphics', 'Intel HD Graphics 630', 'Intel HD Graphics 530',
  'Intel HD Graphics 4600', 'Intel HD Graphics 4000',
].sort()

const RAM_LIST: string[] = [
  // DDR5
  'DDR5 128GB (4×32GB)', 'DDR5 96GB (2×48GB)', 'DDR5 64GB (2×32GB)',
  'DDR5 48GB (2×24GB)', 'DDR5 32GB (2×16GB)', 'DDR5 32GB (4×8GB)',
  'DDR5 16GB (2×8GB)', 'DDR5 16GB (1×16GB)', 'DDR5 8GB (1×8GB)',
  'DDR5-7200 32GB', 'DDR5-6400 32GB', 'DDR5-6000 32GB', 'DDR5-5600 16GB', 'DDR5-4800 16GB',
  // DDR4
  'DDR4 128GB (4×32GB)', 'DDR4 64GB (2×32GB)', 'DDR4 64GB (4×16GB)',
  'DDR4 32GB (2×16GB)', 'DDR4 32GB (4×8GB)',
  'DDR4 16GB (2×8GB)', 'DDR4 16GB (1×16GB)',
  'DDR4 8GB (2×4GB)', 'DDR4 8GB (1×8GB)', 'DDR4 4GB (1×4GB)', 'DDR4 2GB (1×2GB)',
  'DDR4-4000 32GB', 'DDR4-3600 32GB', 'DDR4-3600 16GB', 'DDR4-3200 32GB', 'DDR4-3200 16GB',
  'DDR4-3000 16GB', 'DDR4-2666 16GB', 'DDR4-2400 8GB', 'DDR4-2133 8GB',
  // DDR3
  'DDR3 32GB (4×8GB)', 'DDR3 16GB (2×8GB)', 'DDR3 8GB (2×4GB)',
  'DDR3 4GB (2×2GB)', 'DDR3 4GB (1×4GB)', 'DDR3 2GB (1×2GB)', 'DDR3 1GB',
  'DDR3-1866 8GB', 'DDR3-1600 8GB', 'DDR3-1333 4GB', 'DDR3-1066 2GB',
  // DDR2
  'DDR2 4GB (2×2GB)', 'DDR2 2GB (2×1GB)', 'DDR2-800 2GB', 'DDR2-667 2GB',
  // LPDDR (Laptop/Integrated)
  'LPDDR5X 32GB', 'LPDDR5 32GB', 'LPDDR5 16GB', 'LPDDR4X 32GB', 'LPDDR4X 16GB', 'LPDDR4X 8GB',
]

// ══════════════════════════════════════════════════════════════
//  STYLED COMPONENTS
// ══════════════════════════════════════════════════════════════

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`

const SectionWrap = styled.div`margin-top: 32px; animation: ${fadeIn} 0.4s ease;`

const SectionTitle = styled.h2`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 16px; font-weight: 700;
  color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  &::after { content: ''; flex: 1; height: 1px; background: rgba(124,58,237,0.2); }
`

const Card = styled.div`
  background: rgba(18,18,31,0.85); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 16px; padding: 24px; backdrop-filter: blur(8px);
`

const InputsGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
  @media(max-width:768px){grid-template-columns:1fr;}
`

const FieldWrap = styled.div`display:flex;flex-direction:column;gap:6px;position:relative;`

const FieldLabel = styled.label`
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
  color: rgba(148,163,184,0.6); display: flex; align-items: center; gap: 5px;
`

const ComboWrapper = styled.div`position:relative;`

const ComboInput = styled.input`
  width: 100%; box-sizing: border-box; padding: 10px 36px 10px 12px;
  background: rgba(12,12,24,0.8); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 10px; color: #e2e8f0; font-size: 13px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder{color:rgba(148,163,184,0.35);}
  &:focus{border-color:rgba(124,58,237,0.6);box-shadow:0 0 0 3px rgba(124,58,237,0.1);}

  /* Fix for autofill background color in Chrome */
  &:-webkit-autofill,
  &:-webkit-autofill:hover, 
  &:-webkit-autofill:focus, 
  &:-webkit-autofill:active{
    -webkit-box-shadow: 0 0 0 30px #0c0c18 inset !important;
    -webkit-text-fill-color: #e2e8f0 !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`

const ComboIcon = styled.div`
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  color:rgba(148,163,184,0.4);pointer-events:none;display:flex;align-items:center;
`

const ClearBtn = styled.button`
  position:absolute;right:10px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;color:rgba(148,163,184,0.5);
  padding:2px;display:flex;align-items:center;border-radius:4px;
  &:hover{color:#e2e8f0;background:rgba(255,255,255,0.05);}
`

const Dropdown = styled.div`
  position:absolute;top:calc(100% + 4px);left:0;right:0;
  background:rgba(15,15,30,0.98);border:1px solid rgba(124,58,237,0.3);
  border-radius:10px;max-height:220px;overflow-y:auto;z-index:100;
  box-shadow:0 12px 40px rgba(0,0,0,0.6);
  &::-webkit-scrollbar{width:4px;}
  &::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.4);border-radius:2px;}
`

const DropdownItem = styled.div<{ $active?: boolean }>`
  padding:9px 14px;font-size:13px;cursor:pointer;
  color:${p => p.$active ? '#c4b5fd' : 'rgba(226,232,240,0.85)'};
  background:${p => p.$active ? 'rgba(124,58,237,0.15)' : 'transparent'};
  transition:background 0.15s;
  &:hover{background:rgba(124,58,237,0.12);color:#e2e8f0;}
  &:first-child{border-radius:10px 10px 0 0;}
  &:last-child{border-radius:0 0 10px 10px;}
`

const FreeTypeTip = styled.div`
  padding: 9px 14px; font-size: 12px;
  color: rgba(124,58,237,0.8); background: rgba(124,58,237,0.06);
  border-top: 1px solid rgba(124,58,237,0.1);
  border-radius: 0 0 10px 10px;
  display: flex; align-items: center; gap: 6px;
`

const AnalyzeBtn = styled.button<{ $loading?: boolean }>`
  margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px 24px;
  background: ${p => p.$loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)'};
  border: 1px solid rgba(124,58,237,0.5); border-radius: 12px;
  color: #fff; font-size: 14px; font-weight: 700;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  transition: all 0.2s; letter-spacing: 0.3px;
  &:hover:not(:disabled){
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,58,237,0.4);
  }
  &:disabled{opacity:0.6;cursor:not-allowed;}
`

const SpinIcon = styled(Loader2)`animation:${spin} 0.8s linear infinite;`

const ResultWrap = styled.div`
  margin-top: 20px; animation: ${fadeIn} 0.5s ease;
`

const TranslateBadge = styled.span`
  margin-left: auto; display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: rgba(124,58,237,0.7); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
`

const VerdictBanner = styled.div<{ $color: 'green' | 'yellow' | 'red' }>`
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-radius: 12px; margin-bottom: 16px;
  background: ${p => p.$color === 'green' ? 'rgba(34,197,94,0.1)' : p.$color === 'yellow' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)'};
  border: 1px solid ${p => p.$color === 'green' ? 'rgba(34,197,94,0.3)' : p.$color === 'yellow' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'};
`

const VerdictText = styled.div`flex:1;`

const VerdictLabel = styled.div<{ $color: 'green' | 'yellow' | 'red' }>`
  font-size: 15px; font-weight: 800;
  color: ${p => p.$color === 'green' ? '#4ade80' : p.$color === 'yellow' ? '#fbbf24' : '#f87171'};
`

const VerdictSummary = styled.div`
  font-size: 13px; color: rgba(226,232,240,0.75); margin-top: 4px; line-height: 1.6;
`

// FPS Section
const FpsSection = styled.div`
  margin-bottom: 14px;
  background: rgba(12,12,24,0.7); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 14px; padding: 18px 20px;
`

const FpsSectionTitle = styled.div`
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
  color: rgba(148,163,184,0.5); margin-bottom: 14px;
  display: flex; align-items: center; gap: 6px;
`

const FpsGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  @media(max-width:500px){grid-template-columns:1fr 1fr;}
`

const FpsBox = styled.div<{ $variant: 'low' | 'avg' | 'high' }>`
  background: rgba(124,58,237,0.06); border-radius: 10px; padding: 12px;
  border: 1px solid rgba(124,58,237,0.12);
  text-align: center;
`

const FpsLabel = styled.div`font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(148,163,184,0.4); margin-bottom: 4px;`

const FpsValue = styled.div<{ $variant: 'low' | 'avg' | 'high' }>`
  font-size: ${p => p.$variant === 'avg' ? '26px' : '20px'};
  font-weight: 900;
  color: ${p => p.$variant === 'high' ? '#4ade80' : p.$variant === 'avg' ? '#a78bfa' : '#94a3b8'};
  line-height: 1;
`

const FpsUnit = styled.span`font-size: 13px; font-weight: 600; color: rgba(148,163,184,0.5); margin-left: 3px;`

const FpsSub = styled.div`font-size: 10px; color: rgba(148,163,184,0.4); margin-top: 3px;`

const FpsPresetBar = styled.div`
  margin-top: 14px; display: flex; gap: 6px; flex-wrap: wrap;
`

const FpsPresetChip = styled.div<{ $active?: boolean }>`
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.06)'};
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.1)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.5)'};
`

// Settings Table
const SettingsSection = styled.div`
  margin-bottom: 14px;
  background: rgba(12,12,24,0.7); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 14px; padding: 18px 20px;
`

const SettingsTable = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`

const SettingsRow = styled.div`
  display: grid; grid-template-columns: 140px 1fr; align-items: center; gap: 10px;
  @media(max-width:500px){grid-template-columns:1fr;}
`

const SettingsKey = styled.div`
  font-size: 12px; font-weight: 600; color: rgba(148,163,184,0.55);
`

const SettingsVal = styled.div<{ $level?: string }>`
  font-size: 13px; font-weight: 700;
  color: ${p => {
    const l = (p.$level || '').toLowerCase()
    if (l.includes('ultra') || l.includes('epic') || l.includes('maximum')) return '#4ade80'
    if (l.includes('high') || l.includes('1440') || l.includes('4k') || l.includes('2160')) return '#86efac'
    if (l.includes('medium') || l.includes('1080')) return '#fbbf24'
    if (l.includes('low') || l.includes('720')) return '#fb923c'
    if (l.includes('very low') || l.includes('480')) return '#f87171'
    if (l.includes('off') || l.includes('disable')) return '#94a3b8'
    return '#e2e8f0'
  }};
  display: flex; align-items: center; gap: 6px;
`

const TipsSection = styled.div`
  background: rgba(12,12,24,0.7); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 14px; padding: 18px 20px;
`

const TipItem = styled.div`
  display: flex; gap: 10px; align-items: flex-start;
  font-size: 13px; color: rgba(226,232,240,0.82); line-height: 1.6;
  padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
  &:last-child{border-bottom:none;}
`

const TipArrow = styled.span`color:#7c3aed;font-weight:700;flex-shrink:0;font-size:14px;`

const PcBar = styled.div`display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;`

const PcChip = styled.div`
  display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;
  background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);
  font-size:11px;color:#c4b5fd;font-weight:600;
`

const ErrorBox = styled.div`
  margin-top:16px;padding:14px 18px;background:rgba(239,68,68,0.08);
  border:1px solid rgba(239,68,68,0.2);border-radius:10px;font-size:13px;color:#f87171;
  display:flex;align-items:flex-start;gap:8px;line-height:1.5;
`

const ShimmerCard = styled.div`
  border-radius:12px;height:80px;
  background:linear-gradient(90deg,rgba(124,58,237,0.05) 25%,rgba(124,58,237,0.12) 50%,rgba(124,58,237,0.05) 75%);
  background-size:200% 100%;animation:${shimmer} 1.5s infinite;border:1px solid rgba(124,58,237,0.1);
`

// ══════════════════════════════════════════════════════════════
//  SEARCHABLE COMBOBOX — พิมพ์เองได้เสมอ
// ══════════════════════════════════════════════════════════════

interface ComboBoxProps {
  placeholder: string
  options: string[]
  value: string
  onChange: (v: string) => void
  t: (key: string) => string
}

function ComboBox({ placeholder, options, value, onChange }: ComboBoxProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  const filtered = query.length === 0
    ? options.slice(0, 80)
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, 80)

  const isCustomValue = query.length > 0 && !options.some(o => o.toLowerCase() === query.toLowerCase())

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item: string) => { onChange(item); setQuery(item); setOpen(false) }
  const handleClear = () => { onChange(''); setQuery(''); setOpen(false) }

  return (
    <ComboWrapper ref={wrapRef}>
      <ComboInput
        value={query}
        placeholder={placeholder}
        autoComplete="new-password" // Hack to force Chrome to disable autofill
        autoCorrect="off"
        spellCheck={false}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {query
        ? <ClearBtn type="button" onClick={handleClear}><X size={13} /></ClearBtn>
        : <ComboIcon><ChevronDown size={14} /></ComboIcon>
      }
      {open && (
        <Dropdown>
          {filtered.length === 0
            ? (
              <FreeTypeTip>
                ✏️ ไม่พบใน list — สามารถใช้ข้อมูลที่พิมพ์ได้เลย
              </FreeTypeTip>
            )
            : (
              <>
                {filtered.map(item => (
                  <DropdownItem key={item} $active={item === value} onMouseDown={() => handleSelect(item)}>
                    {item}
                  </DropdownItem>
                ))}
                {isCustomValue && (
                  <FreeTypeTip>
                    ✏️ ไม่เจอ? กด Enter หรือปิด dropdown เพื่อใช้ "<strong>{query}</strong>"
                  </FreeTypeTip>
                )}
              </>
            )
          }
        </Dropdown>
      )}
    </ComboWrapper>
  )
}

// ══════════════════════════════════════════════════════════════
//  AI CALL — ใช้ generateGameData + prompt ละเอียด
// ══════════════════════════════════════════════════════════════

interface FpsPreset {
  preset: string        // "Ultra 4K" | "High 1080p" | "Medium 720p" etc
  fps_low: number
  fps_avg: number
  fps_high: number
}

interface SettingsDetail {
  resolution: string        // "1920×1080 (1080p)"
  overall_preset: string    // "High"
  texture_quality: string
  shadow_quality: string
  anti_aliasing: string
  view_distance: string
  effects_quality: string
  v_sync: string
  ray_tracing?: string
}

interface SpecResult {
  verdict: string
  verdict_color: 'green' | 'yellow' | 'red'
  summary: string
  recommended_preset: FpsPreset
  alternate_presets: FpsPreset[]
  settings: SettingsDetail
  tips: string[]
}

async function analyzeSpecWithAI(game: Game, cpu: string, gpu: string, ram: string): Promise<SpecResult> {
  const sr = game.system_requirements
  const minReq = sr?.minimum?.about || 'N/A'
  const recReq = sr?.recommended?.about || 'N/A'

  const hasGpu = gpu.trim().length > 0

  const prompt = `You are a PC hardware expert. Analyze if this PC can run the game and provide DETAILED performance data.

Game: "${game.title}"
Game Minimum Spec: ${minReq.substring(0, 250)}
Game Recommended Spec: ${recReq.substring(0, 250)}
User PC: CPU=${cpu || 'Unknown'}, GPU=${hasGpu ? gpu : 'Not specified / Integrated'}, RAM=${ram || 'Unknown'}

Return ONLY valid JSON (no markdown, no extra text):
{
  "verdict": "Can Run Smoothly" or "Can Run (Recommended)" or "Can Run (Low Settings)" or "Struggles / Playable" or "Cannot Run",
  "verdict_color": "green" or "yellow" or "red",
  "summary": "2-3 sentences: compare user PC vs game req, mention specific bottlenecks if any",
  "recommended_preset": {
    "preset": "e.g. High @ 1080p",
    "fps_low": 55,
    "fps_avg": 75,
    "fps_high": 95
  },
  "alternate_presets": [
    { "preset": "e.g. Ultra @ 1080p", "fps_low": 38, "fps_avg": 50, "fps_high": 65 },
    { "preset": "e.g. Medium @ 720p", "fps_low": 70, "fps_avg": 95, "fps_high": 120 }
  ],
  "settings": {
    "resolution": "1920×1080 (1080p)",
    "overall_preset": "High",
    "texture_quality": "High",
    "shadow_quality": "Medium",
    "anti_aliasing": "TAA",
    "view_distance": "High",
    "effects_quality": "Medium",
    "v_sync": "Off (use frame cap)",
    "ray_tracing": "Off"
  },
  "tips": [
    "Specific tip 1 relevant to this exact hardware combo",
    "Specific tip 2 about VRAM/RAM usage for this game",
    "Specific tip 3 about CPU/GPU optimization"
  ]
}
Note: fps_low=1% low, fps_avg=average, fps_high=peak. ${!hasGpu ? "If no GPU is specified, ASSUME the user is using the integrated/onboard graphics of the specified CPU (e.g. Radeon Graphics, Intel Iris Xe, UHD). Estimate realistic FPS for the CPU's integrated graphics." : "Estimate realistic FPS based on known benchmarks for this GPU+game combo."}`

  const result = await generateGameData(prompt)
  return result as SpecResult
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

interface Props {
  game: Game
}

export default function PCSpecChecker({ game }: Props) {
  const { locale, isTranslating, t } = useLanguage()
  const [cpu, setCpu] = useState('')
  const [gpu, setGpu] = useState('')
  const [ram, setRam] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SpecResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canAnalyze = cpu.trim().length > 0 || gpu.trim().length > 0 || ram.trim().length > 0

  const handleAnalyze = async () => {
    if (!canAnalyze || loading) return
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await analyzeSpecWithAI(game, cpu.trim(), gpu.trim(), ram.trim())
      if (!res.verdict || !res.verdict_color) throw new Error(t('spec.err_format'))
      setResult(res)
    } catch (e: any) {
      const msg: string = e.message || 'Unknown error'
      if (msg.includes('quota') || msg.includes('QUOTA') || msg.includes('429') || msg.includes('exhausted'))
        setError(t('spec.err_quota'))
      else if (msg.includes('No active API keys') || msg.includes('fallback'))
        setError(t('spec.err_no_key'))
      else
        setError(`${t('spec.err_generic')}${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const verdictIcon = (color: 'green' | 'yellow' | 'red') =>
    color === 'green' ? <CheckCircle size={24} color="#4ade80" />
      : color === 'yellow' ? <AlertTriangle size={24} color="#fbbf24" />
        : <XCircle size={24} color="#f87171" />

  const fmtFps = (n: number | null) => n == null ? '—' : `${n}`

  return (
    <SectionWrap>
      {/* Fix Google Translate Hover Issues in Dark Mode */}
      <style>{`
        font:hover {
          background-color: transparent !important;
          color: inherit !important;
          box-shadow: none !important;
        }
        .VIpgJd-yAWNEb-hvhznd-THI6Vb {
          background-color: transparent !important;
          color: inherit !important;
        }
        font {
          background-color: transparent !important;
        }
      `}</style>

      <SectionTitle>
        <Monitor size={15} />
        {t('spec.title')}
        {locale !== 'en' && (
          <TranslateBadge>
            {isTranslating
              ? <><Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('spec.translating')}</>
              : <><Languages size={11} /> {t('spec.google_translate')}</>
            }
          </TranslateBadge>
        )}
      </SectionTitle>

      <Card>
        {/* Inputs */}
        <InputsGrid>
          <FieldWrap>
            <FieldLabel><Cpu size={12} /> {t('spec.cpu')}</FieldLabel>
            <ComboBox
              placeholder={t('spec.cpu_placeholder')}
              options={CPU_LIST}
              value={cpu}
              onChange={setCpu}
              t={t}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel><Zap size={12} /> {t('spec.gpu')}</FieldLabel>
            <ComboBox
              placeholder={t('spec.gpu_placeholder')}
              options={GPU_LIST}
              value={gpu}
              onChange={setGpu}
              t={t}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel><MemoryStick size={12} /> {t('spec.ram')}</FieldLabel>
            <ComboBox
              placeholder={t('spec.ram_placeholder')}
              options={RAM_LIST}
              value={ram}
              onChange={setRam}
              t={t}
            />
          </FieldWrap>
        </InputsGrid>

        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(148,163,184,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={11} />
          {t('spec.search_or')} <strong style={{ color: 'rgba(124,58,237,0.7)' }}>{t('spec.type_own')}</strong> {t('spec.no_need_list')}
        </div>

        <AnalyzeBtn $loading={loading} onClick={handleAnalyze} disabled={!canAnalyze || loading}>
          {loading
            ? <><SpinIcon size={16} /> {t('spec.analyzing')}</>
            : <><Gauge size={16} /> {t('spec.analyze_btn')}</>
          }
        </AnalyzeBtn>

        {/* Shimmer loading */}
        {loading && (
          <ResultWrap>
            <ShimmerCard style={{ marginBottom: 12 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ShimmerCard style={{ height: 130 }} />
              <ShimmerCard style={{ height: 130 }} />
            </div>
          </ResultWrap>
        )}

        {/* Error */}
        {error && (
          <ErrorBox>
            <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </ErrorBox>
        )}

        {/* Result — translate="yes" ให้ Google Translate แปลเนื้อหา AI */}
        {result && !loading && (
          <ResultWrap translate="yes">
            {/* PC Summary */}
            <PcBar>
              {cpu && <PcChip><Cpu size={10} /> {cpu}</PcChip>}
              {gpu && <PcChip><Zap size={10} /> {gpu}</PcChip>}
              {ram && <PcChip><MemoryStick size={10} /> {ram}</PcChip>}
            </PcBar>

            {/* Verdict */}
            <VerdictBanner $color={result.verdict_color}>
              {verdictIcon(result.verdict_color)}
              <VerdictText>
                <VerdictLabel $color={result.verdict_color}>{result.verdict}</VerdictLabel>
                <VerdictSummary>{result.summary}</VerdictSummary>
              </VerdictText>
            </VerdictBanner>

            {/* FPS Section */}
            <FpsSection>
              <FpsSectionTitle>
                <TrendingUp size={12} />
                {t('spec.fps_title')}
              </FpsSectionTitle>

              {/* Recommended preset FPS */}
              <div style={{ fontSize: 12, color: 'rgba(124,58,237,0.8)', fontWeight: 700, marginBottom: 10 }}>
                🎯 {t('spec.recommended_preset')} {result.recommended_preset.preset}
              </div>
              <FpsGrid>
                <FpsBox $variant="low">
                  <FpsLabel>1% Low</FpsLabel>
                  <FpsValue $variant="low">
                    {fmtFps(result.recommended_preset.fps_low)}
                    {result.recommended_preset.fps_low != null && <FpsUnit>fps</FpsUnit>}
                  </FpsValue>
                  <FpsSub>{t('spec.fps_low_sub')}</FpsSub>
                </FpsBox>
                <FpsBox $variant="avg">
                  <FpsLabel>⌀ Average</FpsLabel>
                  <FpsValue $variant="avg">
                    {fmtFps(result.recommended_preset.fps_avg)}
                    {result.recommended_preset.fps_avg != null && <FpsUnit>fps</FpsUnit>}
                  </FpsValue>
                  <FpsSub>{t('spec.fps_avg_sub')}</FpsSub>
                </FpsBox>
                <FpsBox $variant="high">
                  <FpsLabel>Peak High</FpsLabel>
                  <FpsValue $variant="high">
                    {fmtFps(result.recommended_preset.fps_high)}
                    {result.recommended_preset.fps_high != null && <FpsUnit>fps</FpsUnit>}
                  </FpsValue>
                  <FpsSub>{t('spec.fps_high_sub')}</FpsSub>
                </FpsBox>
              </FpsGrid>

              {/* Alternate presets */}
              {result.alternate_presets && result.alternate_presets.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.45)', marginTop: 14, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('spec.other_presets')}
                  </div>
                  <FpsPresetBar>
                    {result.alternate_presets.map((ap, i) => (
                      <FpsPresetChip key={i}>
                        {ap.preset} — avg <strong>{fmtFps(ap.fps_avg)}</strong> fps
                        {ap.fps_low != null && ` (low ${fmtFps(ap.fps_low)})`}
                      </FpsPresetChip>
                    ))}
                  </FpsPresetBar>
                </>
              )}
            </FpsSection>

            {/* Settings Detail */}
            {result.settings && (
              <SettingsSection>
                <FpsSectionTitle>
                  <Settings2 size={12} />
                  {t('spec.settings_title')}
                </FpsSectionTitle>
                <SettingsTable>
                  {[
                    ['📐 ' + t('spec.resolution'), result.settings.resolution],
                    ['🎮 ' + t('spec.overall_preset'), result.settings.overall_preset],
                    ['🖼️ ' + t('spec.texture'), result.settings.texture_quality],
                    ['🌑 ' + t('spec.shadow'), result.settings.shadow_quality],
                    ['✨ ' + t('spec.anti_aliasing'), result.settings.anti_aliasing],
                    ['🔭 ' + t('spec.view_distance'), result.settings.view_distance],
                    ['💥 ' + t('spec.effects'), result.settings.effects_quality],
                    ['🔒 ' + t('spec.vsync'), result.settings.v_sync],
                    ...(result.settings.ray_tracing ? [['🌟 ' + t('spec.ray_tracing'), result.settings.ray_tracing]] : []),
                  ].map(([key, val]) => (
                    <SettingsRow key={key}>
                      <SettingsKey>{key}</SettingsKey>
                      <SettingsVal $level={val}>{val}</SettingsVal>
                    </SettingsRow>
                  ))}
                </SettingsTable>
              </SettingsSection>
            )}

            {/* Tips */}
            {result.tips && result.tips.length > 0 && (
              <TipsSection>
                <FpsSectionTitle>
                  <Lightbulb size={12} />
                  {t('spec.tips_title')}
                </FpsSectionTitle>
                {result.tips.map((tip, i) => (
                  <TipItem key={i}>
                    <TipArrow>→</TipArrow>
                    {tip}
                  </TipItem>
                ))}
              </TipsSection>
            )}
          </ResultWrap>
        )}
      </Card>
    </SectionWrap>
  )
}
