/**
 * 构建后复制静态资源到 dist/ 目录
 * 替代之前 package.json 中的内联单行脚本
 */
const fs = require('fs');
const path = require('path');

const DIST = 'dist';

function copy(src, dst) {
  const dest = path.join(DIST, dst);
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${dst}`);
  } else {
    console.warn(`  ✗ 跳过(源文件不存在): ${src}`);
  }
}

// 静态资源文件列表
const assets = [
  'download.html',
  { src: 'public/error.html', dst: 'error.html' },
  'user_manual.html',
  'user_manual.typ',
  'styles/styles.css',
  'js/script.js',
  'assets/images/LaTeXSnipper.png',
  'assets/images/icon.png',
  'assets/images/mathcraft_abstract_algebra.png',
  'assets/images/mathcraft_chinese_lecture.png',
  'assets/images/mathcraft_dynamics_journal.png',
  'assets/images/mathcraft_limits_series.png',
];

console.log('复制静态资源到 dist/:');
for (const f of assets) {
  if (typeof f === 'string') {
    copy(f, f);
  } else {
    copy(f.src, f.dst);
  }
}
console.log('静态资源复制完成');
