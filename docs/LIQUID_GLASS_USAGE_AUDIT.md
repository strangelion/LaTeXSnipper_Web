# Liquid Glass Usage Audit — V2.1

**范围**：`src/` 首页、下载页、用户手册、OCR 页面、材质 Lab。  
**基线**：`styles/liquid-glass.css` 是唯一的 Liquid Glass Material Engine。

## 统一材质映射

| 场景 | 变体 | Blur | 设计目的 |
| --- | --- | ---: | --- |
| Header / regular navigation | `lg-surface--navigation` | 6px | 高透射、稳定的导航材质 |
| 标签 / 轻量控件 | `lg-surface--clear` | 2px | 保留背景细节与轻边缘 |
| 按钮 / segmented control | `lg-surface--control` | 3px | 可交互的紧凑表面 |
| 浮动动作组 / 悬浮提示 | `lg-surface--floating` | 4px | 轻阴影与稍强边缘 |
| 内容面板 / 侧栏 / OCR 工作区 | `lg-surface--panel` | 8px | 维持可读性但不变成毛玻璃 |
| Modal scrim | overlay treatment | 10px | 仅用于焦点隔离，不当作内容卡片 |

## 使用审计

| 文件 | 组件 | 当前材质 | 结论 |
| --- | --- | --- | --- |
| `src/components/LandingPage.jsx` | Header、公式卡、转换台、生态卡、下载 CTA | `navigation` / `panel` | 已迁移到统一引擎 |
| `download.html` | Header、主题/菜单按钮、推荐下载卡 | `navigation` / `control` / `panel` | 已统一；普通平台卡保持内容卡，不滥用玻璃 |
| `user_manual.html` | Header、双侧栏、浮动箭头、卷标 | `navigation` / `panel` / `floating` / `clear` | 已迁移到统一引擎 |
| `public/ocr.html` | OCR 工作区、结果面板、工具栏与控件 | `panel` / `floating` / `control` | 已迁移到统一引擎 |
| `styles/ocr.css` | 相机 Modal scrim | 10px overlay | 有意保留为遮罩层；不是独立 Glass Engine |
| `design/liquid-glass-lab.html` | 变体与无 Blur 对照 | `clear` / `control` / `floating` / `panel` | V2.1 对比基准页 |
| `public/error.html` | 独立错误页 | legacy blur | 未迁移；独立故障降级页面，不加载产品壳层 |

## V2.1 材质规则

- 不使用固定的 pointer radial 白色光斑。指针只轻微改变 edge 与线性 specular 的位置。
- tint 是低强度线性透射层，不再使用深色实心背景模拟玻璃。
- 所有常规材质的 blur 限制在 2–8px；仅 modal scrim 使用 10px。
- `lg-rim` 采用低不透明度的亮→暗→蓝色边缘过渡，而非白色 border。
- 在 Lab 关闭 Blur 后，仍可见透射、rim 与线性 specular；这用于检查材质不是单靠模糊成立。

## 后续守则

新增产品页面时只选择上述 `lg-surface--*` 变体；不要新建 `glass-panel`、`frosted-*` 或带独立 `backdrop-filter` 的内容表面。若必须新增例外，应先更新本审计表并说明其是否为遮罩层。
