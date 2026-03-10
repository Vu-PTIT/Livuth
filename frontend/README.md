# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

---

## 🌏 Project Solution: Ganvo - Live Atmosphere Discovery

**Ganvo** is a dynamic discovery platform that captures the live atmosphere of local events and brings them directly to you.

### 🌟 Our Vision
Most event platforms rely on static information and outdated reviews, leaving people uncertain about what to actually expect. **Ganvo** solves this by replacing dry data with a real-time, interactive map that pulses with the energy of the community.

Whether it's a local workshop, a cultural festival, or a hidden exhibition, we help you find the right "vibe" before you even arrive. By connecting live insights with community engagement, **Ganvo** ensures you never miss a moment and can preserve your cultural journeys in a meaningful digital form.

---

### 🇻🇳 Tầm nhìn của chúng tôi
**Ganvo** là nền tảng khám phá sôi động, giúp nắm bắt nhịp sống thực tế của các sự kiện địa phương và đưa chúng đến gần hơn với bạn.

Hầu hết các nền tảng hiện nay đều dựa trên thông tin tĩnh và đánh giá cũ kỹ, khiến người dùng khó hình dung được không khí thực sự tại đó. **Ganvo** giải quyết vấn đề này bằng cách thay thế những số liệu khô khan bằng bản đồ tương tác thời gian thực, nơi nhịp đập của cộng đồng luôn hiện hữu.

Dù là một buổi workshop, lễ hội văn hóa hay triển lãm nghệ thuật, chúng tôi giúp bạn tìm thấy đúng "vibe" mà mình mong muốn trước khi đặt chân tới. Bằng cách kết nối dữ liệu trực tiếp với sự tương tác của cộng đồng, **Ganvo** đảm bảo bạn không bao giờ bỏ lỡ những khoảnh khắc quý giá và có thể lưu giữ hành trình văn hóa của mình một cách trọn vẹn nhất.

### ✨ Chức năng chính (Key Features)
*   **AI Festival Assistant**: Tư vấn văn hóa 24/7 (Google Gemini).
*   **Live Interactive Map**: Khám phá nhịp sống sự kiện theo thời gian thực.
*   **Community Vibe Feed**: Nền tảng kết nối và chia sẻ cảm xúc từ sự kiện.
*   **Real-time Insights**: Dữ liệu thực tế về mật độ và mức độ yêu thích.
