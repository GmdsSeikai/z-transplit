import { config } from "../package.json";
import hooks from "./hooks";
import { getJavaStatus } from "./core/pdf/JavaRuntimeManager";
import { installManagedJavaWithProgress } from "./core/pdf/splitview/splitViewFactory";

/**
 * Addon singleton, published as `Zotero.ZTransplit` by src/index.ts (the name
 * comes from package.json config.addonInstance) and reachable from every module
 * through `_globalThis.addon`.
 */
class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    locale?: {
      /** Fluent Localization instance created by initLocale(). */
      current: any;
    };
  };
  public hooks: typeof hooks;
  public api: object;
  /**
   * Java 运行库的编程入口，供设置面板脚本（addon/content/preferences.js）
   * 使用：面板运行在 Cu.Sandbox 里，无法 import 主包模块，只能走这个挂在
   * Zotero 全局上的表面。getStatus 探测当前状态（可能 spawn java -version，
   * 有秒级延迟，由调用方决定时机）；install 带进度窗口安装/修复（内部有
   * in-flight 去重，重复调用共享同一次安装）。
   */
  public java: {
    getStatus: typeof getJavaStatus;
    install: typeof installManagedJavaWithProgress;
  };

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
    };
    this.hooks = hooks;
    this.api = {};
    this.java = {
      getStatus: getJavaStatus,
      install: installManagedJavaWithProgress,
    };
  }
}

export default Addon;
