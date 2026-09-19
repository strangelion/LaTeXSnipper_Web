# 发布 Windows 一键整合包

下载页始终保留一个稳定的 Windows 一键整合包直链作为兜底。每次发布新包时，不需要改前端：用脚本同时生成并上传 `windows-bundle.json`，页面会在读取到它后自动显示新版链接、版本、体积和 SHA-256。

## 发布新包

从仓库根目录执行（将路径与版本替换成实际值）：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-windows-bundle.ps1 `
  -File "C:\releases\LaTeXSnipper-2.7.0-Setup.exe" `
  -Version 2.7.0 `
  -Upload
```

脚本会：

- 计算包的 SHA-256 和体积；
- 在安装包同目录生成 `windows-bundle.json`；
- 将安装包上传到 R2 `release` 桶根目录并核对远端字节数；
- 最后将元数据上传为 `windows-bundle.json`，再核对远端字节数。

`-Version` 可以省略，但仅会从文件名中的稳定版本号（例如 `2.7.0`）推断。预发布版本、文件名不含版本号或显示版本与文件名不一致时，必须显式传入 `-Version`。脚本不会读取主站 release manifest 作为整合包版本，避免两个独立发布序列互相污染。

默认公开地址为 `https://latexsnipper.interknot.dpdns.org/dl`。`-PublicBaseUrl` 会同步写入元数据的公开地址并显示在命令输出中；下载页实际读取元数据中的 `/dl/<文件名>`，由站点 Worker 代理到同一 R2 发布桶。因此只要保持“R2 桶根目录 + `/dl/` 路由”这一约定，替换文件名或版本不需要改前端。

如果同时迁移网站的 `/dl/` 路由或元数据地址，再更新 `public/js/ecosystem-metadata.js` 中的 `WINDOWS_BUNDLE_METADATA_PATH`。这是故意显式的发布基础设施变更，不应仅靠前端链接猜测新地址。

## 已上传安装包时

若安装包已经在正确的 R2 路径中，只上传新元数据即可：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-windows-bundle.ps1 `
  -File "C:\releases\LaTeXSnipper-2.7.0-Setup.exe" `
  -Version 2.7.0 `
  -Upload `
  -MetadataOnly
```

`-MetadataOnly` 会先确认远端同名安装包存在且字节数与本地文件一致；校验失败时不会发布新元数据。这样下载页不会先指向尚未上传或不完整的包。

不要手工伪造或省略 `sha256`：页面只有在元数据通过校验后才会显示可复制的校验值。若元数据暂时不可用，下载页继续显示稳定兜底链接，并明确说明没有可验证的 SHA-256。
