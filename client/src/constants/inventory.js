/**
 * Constantes del sistema de inventario
 * Centraliza valores por defecto y configuraciones
 */

// Valores por defecto del formulario
export const FORM_DEFAULTS = {
  MARGIN_PERCENTAGE: 30,
  MIN_STOCK: 5,
  MAX_STOCK: 100,
  DISCOUNT_MAX: 0,
  PRICE_QUALITY: 0.85,
  TARGET_IMAGE_SIZE: 400
};

// Tipos de items
export const ITEM_TYPES = {
  PRODUCT: 'producto',
  SERVICE: 'servicio',
  ELECTROBAR: 'electrobar'
};

// Estados de validación
export const VALIDATION_STATUS = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Tabs del formulario
export const FORM_TABS = {
  BASIC: 'basico',
  PROVIDER: 'proveedor',
  PRICING: 'precios',
  STOCK: 'stock',
  MEDIA: 'multimedia'
};

// Orden de tabs para navegación
export const TAB_ORDER = [
  FORM_TABS.BASIC,
  FORM_TABS.PROVIDER,
  FORM_TABS.PRICING,
  FORM_TABS.STOCK,
  FORM_TABS.MEDIA
];

// Categorías por defecto
export const CATEGORIES = {
  // Dispositivos
  DEVICES: [
    'Smartphones',
    'Tablets',
    'Laptops',
    'PC de Escritorio',
    'Consolas de Videojuegos',
    'Smartwatch',
    'Hogar Inteligente'
  ],
  
  // Audio & Video
  AUDIO_VIDEO: [
    'Audífonos',
    'Cornetas y Parlantes',
    'Micrófonos',
    'Monitores',
    'TV y Pantallas',
    'Proyectores',
    'Streaming & Cámaras'
  ],
  
  // Gaming
  GAMING: [
    'Gaming',
    'Accesorios Gaming',
    'Sillas Gamer',
    'Componentes PC Gamer',
    'Controles & Joysticks',
    'Merchandising Gaming'
  ],
  
  // Accesorios
  ACCESSORIES: [
    'Accesorios',
    'Cables y Adaptadores',
    'Cargadores y Fuentes',
    'Memorias USB y SD',
    'Discos Duros y SSD',
    'Fundas & Protectores'
  ],
  
  // Networking
  NETWORKING: [
    'Routers y Modems',
    'Access Points',
    'Switches',
    'Antenas WiFi'
  ],
  
  // Electrobar
  ELECTROBAR: [
    'Bebidas',
    'Snacks',
    'Golosinas',
    'Otros Consumibles'
  ],
  
  // Servicios
  SERVICES: [
    'Reparaciones',
    'Mantenimiento',
    'Instalación',
    'Soporte Técnico',
    'Otros Servicios'
  ]
};

// Aplanar categorías para selector
export const CATEGORIES_FLAT = Object.values(CATEGORIES).flat();

// Formatos de imagen permitidos
export const IMAGE_FORMATS = {
  ALLOWED: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  MAX_SIZE_MB: 3
};

// Configuración de validaciones
export const VALIDATION_RULES = {
  MIN_PRICE: 0.01,
  MIN_STOCK: 0,
  MAX_DESCRIPTION_LENGTH: 255,
  MAX_OBSERVATIONS_LENGTH: 500,
  CODE_PATTERN: /^[A-Z0-9-_]+$/i
};

// Mensajes de validación
export const VALIDATION_MESSAGES = {
  REQUIRED_DESCRIPTION: 'La descripción es obligatoria',
  REQUIRED_BARCODE: 'El código de barras es obligatorio',
  REQUIRED_PRICE: 'El precio es obligatorio',
  REQUIRED_PROVIDER: 'Debe seleccionar un proveedor',
  REQUIRED_STOCK: 'El stock es obligatorio',
  INVALID_PRICE: 'El precio debe ser mayor a 0',
  INVALID_SALE_PRICE: 'El precio de venta debe ser mayor al precio de costo',
  DUPLICATE_INTERNAL_CODE: 'El código interno ya existe - debe ser único',
  DUPLICATE_BARCODE_WARNING: 'Código de barras duplicado detectado'
};

// Configuración de auto-guardado
export const AUTO_SAVE_CONFIG = {
  ENABLED: false,
  DEBOUNCE_MS: 2000
};

// Atajos de teclado
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  CANCEL: 'Escape',
  RESET: 'Ctrl+R',
  NEXT_TAB: 'Tab',
  PREV_TAB: 'Shift+Tab'
};

export default {
  FORM_DEFAULTS,
  ITEM_TYPES,
  VALIDATION_STATUS,
  FORM_TABS,
  TAB_ORDER,
  CATEGORIES,
  CATEGORIES_FLAT,
  IMAGE_FORMATS,
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
  AUTO_SAVE_CONFIG,
  KEYBOARD_SHORTCUTS
};




