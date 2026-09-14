import { useEffect, useState } from "react";
import { ArrowLeft, Box } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ModelPerformancePanel from "../../components/ModelPerformancePanel";
import { PageContainer } from "../../components/ui/PageContainer";
import { PublicFooter } from "../../components/ui/PublicFooter";
import { ApiError, api, type ApiPricing } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function ModelDetails() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { modelId } = useParams();
  const [model, setModel] = useState<ApiPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .pricing()
      .then((payload) => {
        const requested = decodeURIComponent(modelId ?? "");
        setModel(
          payload.models.find((item) => item.model_name === requested) ?? null,
        );
      })
      .catch((cause) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : t("Unable to load model details.", "无法加载模型详情。"),
        ),
      )
      .finally(() => setLoading(false));
  }, [modelId, t]);

  return (
    <div className="min-h-screen bg-primary px-6 pb-12 pt-24">
      <div className="mx-auto mb-8 w-full max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-overline font-mono uppercase tracking-[0.2em] text-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("Back", "返回")}
        </button>
      </div>
      <PageContainer
        title={t("Model Details", "模型详情")}
        subtitle={t(
          "Pricing and availability published by the gateway.",
          "网关发布的定价与可用性信息。",
        )}
        isLoading={loading}
        error={error}
        onRetry={() => window.location.reload()}
      >
        {model ? (
          <>
          <div className="max-w-2xl border border-[#121110]/10 bg-white p-8 md:p-12">
            <div className="mb-10 flex items-center gap-4">
              <Box className="h-6 w-6" />
              <h2 className="font-serif text-3xl">{model.model_name}</h2>
            </div>
            <dl className="grid gap-6 border-t border-[#121110]/10 pt-6 sm:grid-cols-2">
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Provider", "供应商")}
                </dt>
                <dd className="mt-2 text-body">{model.owner_by || "-"}</dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Billing", "计费")}
                </dt>
                <dd className="mt-2 text-body">
                  {model.billing_mode || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Billing expression", "计费表达式")}
                </dt>
                <dd className="mt-2 break-all font-mono text-label">
                  {model.billing_expr || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Model ratio", "模型倍率")}
                </dt>
                <dd className="mt-2 font-mono text-body">
                  {model.model_ratio}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Completion ratio", "补全倍率")}
                </dt>
                <dd className="mt-2 font-mono text-body">
                  {model.completion_ratio}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Cache ratio", "缓存倍率")}
                </dt>
                <dd className="mt-2 font-mono text-body">
                  {model.cache_ratio ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Fixed price", "固定价格")}
                </dt>
                <dd className="mt-2 font-mono text-body">
                  {model.model_price || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Supported endpoints", "支持接口")}
                </dt>
                <dd className="mt-2 text-body">
                  {model.supported_endpoint_types?.join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Available groups", "可用分组")}
                </dt>
                <dd className="mt-2 text-body">
                  {model.enable_groups?.join(", ") || "-"}
                </dd>
              </div>
            </dl>
            {model.description && (
              <p className="mt-8 border-t border-[#121110]/10 pt-6 text-label leading-relaxed text-muted">
                {model.description}
              </p>
            )}
          </div>
          <ModelPerformancePanel model={model} />
          </>
        ) : (
          <div className="border border-dashed border-[#121110]/20 bg-white p-16 text-center text-label text-muted">
            {t("Model pricing was not found.", "未找到该模型的定价信息。")}
          </div>
        )}
      </PageContainer>
      <PublicFooter />
    </div>
  );
}
