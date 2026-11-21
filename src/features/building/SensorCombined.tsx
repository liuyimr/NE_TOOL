import { Link } from 'react-router-dom';
import QuickRefTable from '@/components/QuickRefTable';

/**
 * BA10 传感器量程与精度选型（宿主）
 * ------------------------------------------------------------------
 * v1.6 合并：原「工控 C13 常用传感器输出信号速查」并入本页。
 * 两个视角并排展示，两张速查表（building.sensorSelection / automation.sensors）均保留：
 *  - 楼控视角：量程 / 精度 / 安装要点；
 *  - 工控视角：信号类型 / 典型量程 / 接线方式。
 * 说明：本页为纯速查展示，无需 ToolDef 入参（速查表 id 由注册表 quickRefIds 声明）。
 */
export default function SensorCombined(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-fg">
          楼控视角（量程 / 精度 / 安装）
        </h2>
        <p className="px-1 text-xs text-muted">
          温度、湿度、压力、流量、液位等楼控测点的推荐量程、精度、输出信号与安装要点。
        </p>
        <QuickRefTable tableId="building.sensorSelection" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-fg">
          工控视角（信号类型 / 接线）
        </h2>
        <p className="px-1 text-xs text-muted">
          PT100、热电偶、称重、流量计等现场仪表的输出信号形式、典型量程与接线要点（原「常用传感器输出信号速查」已并入本页）。
        </p>
        <QuickRefTable tableId="automation.sensors" />
      </section>

      {/* 结果区统一免责入口：与关于页 #/about#disclaimer 保持同一口径 */}
      <p className="px-1 text-xs leading-relaxed text-muted">
        结果为方案阶段工程估算，含经验系数与简化假设，不作为施工图设计、采购、验收或安全校验依据；
        <Link
          to="/about#disclaimer"
          className="ne-focus ml-1 underline decoration-dotted underline-offset-2"
        >
          查看完整免责声明 →
        </Link>
      </p>
    </div>
  );
}
