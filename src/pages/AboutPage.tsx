import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
// NewE 标识：构建时内联为 data URI（见 vite.config.ts 的 assetsInlineLimit），
// 保证单文件构建同样自包含，不额外产生外部资源请求
import neweLogo from '@/assets/newe-logo.webp';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { byDomain, getAll } from '@/registry';
import { useAppStore } from '@/store/useAppStore';
import {
  APP_NAME,
  APP_NAME_EN,
  APP_TAGLINE,
  APP_VERSION,
  AUTHOR,
  BUILD_TIME,
  CONTACT_EMAIL,
  ISSUES_URL,
  LICENSE_NAME,
  REPO_URL,
} from '@/config/appInfo';

/** 单行「名称 + 值」 */
function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <dt className="w-20 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-fg">{children}</dd>
    </div>
  );
}

/**
 * 关于页：版本、作者、仓库、许可、数据来源、全站统一免责声明与本地数据管理
 */
export default function AboutPage(): JSX.Element {
  const favorites = useAppStore((s) => s.favorites);
  const recents = useAppStore((s) => s.recents);
  const resetLocalData = useAppStore((s) => s.resetLocalData);
  const [cleared, setCleared] = useState(false);
  const location = useLocation();

  // HashRouter 会把 `#/about#disclaimer` 解析为 pathname=/about、hash=#disclaimer，
  // 路由本身不负责锚点滚动，故在关于页挂载/定位变化时手动滚动到统一免责卡片。
  useEffect(() => {
    if (location.hash !== '#disclaimer') return;
    const target = document.getElementById('disclaimer');
    // jsdom 等离线/测试环境可能未实现 scrollIntoView，做能力检测避免运行时报错
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start' });
    }
  }, [location.hash]);

  const total = getAll().length;
  const counts = {
    network: byDomain('network').length,
    building: byDomain('building').length,
    hvac: byDomain('hvac').length,
    automation: byDomain('automation').length,
    elec: byDomain('elec').length,
  };

  function handleClear(): void {
    if (!window.confirm('将清空本机的收藏、最近使用与自定义单位，确定继续？')) return;
    resetLocalData();
    setCleared(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="ne-surface flex flex-col items-center gap-1 px-4 py-6 text-center">
        <img
          src={neweLogo}
          alt="新易科技工作室 NewE"
          className="mb-1 h-11 w-auto rounded-md bg-white px-2 py-1.5 ring-1 ring-border"
        />
        <h2 className="text-lg font-semibold text-fg">{APP_NAME}</h2>
        <p className="text-xs text-muted">
          {APP_NAME_EN} · 版本 v{APP_VERSION}
        </p>
        <p className="mt-1 text-sm text-muted">{APP_TAGLINE}</p>
      </section>

      <Card title="基本信息">
        <dl className="divide-y divide-border">
          <Row label="版本">v{APP_VERSION}</Row>
          <Row label="构建日期">{BUILD_TIME}</Row>
          <Row label="作者">{AUTHOR}</Row>
          <Row label="联系邮箱">
            <a href={`mailto:${CONTACT_EMAIL}`} className="break-all">
              {CONTACT_EMAIL}
            </a>
          </Row>
          <Row label="开源许可">{LICENSE_NAME}</Row>
          <Row label="仓库地址">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="break-all">
              {REPO_URL}
            </a>
          </Row>
          <Row label="问题反馈">
            <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="break-all">
              提交 Issue
            </a>
          </Row>
          <Row label="包含工具">
            共 {total} 个：网络/IoT {counts.network}、BA/弱电 {counts.building}、暖通/水暖{' '}
            {counts.hvac}、工控 {counts.automation}、电工 {counts.elec}
          </Row>
        </dl>
      </Card>

      <Card title="隐私说明">
        <p className="text-sm text-muted">
          所有计算都在你的浏览器里完成，没有任何后端服务，也不会向外部发送数据。收藏、最近使用、
          主题偏好只保存在本机浏览器（localStorage，键名 <code className="font-mono">ne:app</code>）。
          卸载或清除浏览器数据后这些记录会丢失，重要参数请自行留存。
        </p>
      </Card>

      {/* 全站统一免责口径：稳定锚点 id，供结果区入口与外部分享链接单点引用 */}
      <div id="disclaimer" className="scroll-mt-16">
        <Card title="数据来源与免责声明">
          <p className="text-sm text-muted">
            计算公式依据通用工程教材与行业惯例；速查数据（线序、端口、信道、Modbus 功能码、
            载流量、照度标准等）整理自公开标准与厂家资料，页面底部标注了依据与更新日期。
          </p>
          <p className="mt-2 text-sm text-muted">
            本工具所有计算结果与速查数据均为方案阶段工程估算，含经验系数与简化假设，
            不得作为施工图设计、设备采购、产品验收、安全校验，或消防、人身电击防护判定依据；
            也不得替代设计计算书、型式试验与法定检验。
          </p>
          <p className="mt-2 text-sm text-muted">
            涉及强制性要求的，一律以现行全文强制性工程建设规范、现行国家/行业标准、
            项目设计说明与厂家样本为准。本工具引用的推荐性标准（GB/T、JGJ/T 等）仅供技术参考，
            不得标注或理解为「强制性条文」；已废止标准均标明被替代关系，例如 GB 13955-2005
            已废止并由 GB/T 13955-2017 替代，不得作为现行强制性依据引用。
          </p>
          <p className="mt-2 text-sm text-muted">
            实际工程须由相应专业注册工程师按项目实际条件复核后方可采用；作者不对因使用本工具
            产生的任何后果承担责任。
          </p>
        </Card>
      </div>

      <Card title="本地数据">
        <p className="text-sm text-muted">
          当前收藏 {favorites.length} 个，最近使用 {recents.length} 条。
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="danger" size="sm" onClick={handleClear}>
            清空本地数据
          </Button>
          {cleared && <span className="text-xs text-success">已清空</span>}
        </div>
      </Card>

      <p className="pb-2 text-center text-xs text-muted">
        © {new Date().getFullYear()} {AUTHOR} · 以 {LICENSE_NAME} 许可开源
      </p>
    </div>
  );
}
