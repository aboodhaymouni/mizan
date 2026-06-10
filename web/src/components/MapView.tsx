"use client";
/**
 * خريطة غرفة التحكم — MapLibre GL فوق Carto dark-matter (بلا مفاتيح — قرار TM-14)
 * طبقات: الأحواض (صحة) → الاستبعادات (RAMSAR) → الحقول (🔴🟠🟢) → مواقع الإنفاذ
 */
import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BasinsFC, FieldsFC, ValidationSite } from "@/lib/types";
import { useLang } from "@/lib/i18n";

const JORDAN_BOUNDS: LngLatBoundsLike = [
  [34.6, 29.0],
  [39.6, 33.5],
];

interface Props {
  fields?: FieldsFC | null;
  basins?: BasinsFC | null;
  exclusions?: GeoJSON.FeatureCollection | null;
  validationSites?: ValidationSite[] | null;
  yearFilter?: number | null;
  onFieldClick?: (id: string) => void;
  bounds?: LngLatBoundsLike;
  className?: string;
  showBasinLabels?: boolean;
  focusFieldId?: string | null;
}

const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#060B14" } },
    { id: "carto", type: "raster", source: "carto", paint: { "raster-opacity": 0.85 } },
  ],
};

export default function MapView({
  fields,
  basins,
  exclusions,
  validationSites,
  yearFilter,
  onFieldClick,
  bounds,
  className = "h-[60vh]",
  showBasinLabels = false,
  focusFieldId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { lang } = useLang();

  // إنشاء الخريطة مرة واحدة
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      bounds: bounds ?? JORDAN_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      // ---- الأحواض
      map.addSource("basins", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "basins-fill",
        type: "fill",
        source: "basins",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "modeled", "#F43F5E",
            "secondary", "#F59E0B",
            "#27405F",
          ],
          "fill-opacity": ["match", ["get", "status"], "modeled", 0.16, "secondary", 0.12, 0.06],
        },
      });
      map.addLayer({
        id: "basins-line",
        type: "line",
        source: "basins",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "modeled", "#F43F5E",
            "secondary", "#F59E0B",
            "#27405F",
          ],
          "line-width": ["match", ["get", "status"], "modeled", 1.8, 1.1],
          "line-dasharray": [3, 2],
          "line-opacity": 0.8,
        },
      });

      // ---- مناطق الاستبعاد (محمية الأزرق الرطبة)
      map.addSource("exclusions", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "exclusions-fill",
        type: "fill",
        source: "exclusions",
        paint: { "fill-color": "#38BDF8", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "exclusions-line",
        type: "line",
        source: "exclusions",
        paint: { "line-color": "#38BDF8", "line-width": 1.4, "line-dasharray": [2, 2] },
      });

      // ---- الحقول المشبوهة
      map.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        minzoom: 9,
        paint: {
          "fill-color": [
            "match",
            ["get", "tier"],
            "red", "#F43F5E",
            "orange", "#F59E0B",
            "#10B981",
          ],
          "fill-opacity": 0.5,
        },
      });
      map.addLayer({
        id: "fields-outline",
        type: "line",
        source: "fields",
        minzoom: 9,
        paint: {
          "line-color": [
            "match",
            ["get", "tier"],
            "red", "#F43F5E",
            "orange", "#F59E0B",
            "#10B981",
          ],
          "line-width": 1.2,
        },
      });
      map.addLayer({
        id: "fields-points",
        type: "circle",
        source: "fields",
        maxzoom: 9,
        paint: {
          "circle-color": [
            "match",
            ["get", "tier"],
            "red", "#F43F5E",
            "orange", "#F59E0B",
            "#10B981",
          ],
          "circle-radius": [
            "interpolate", ["linear"], ["get", "area_ha"],
            2, 2.5,
            60, 7,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-color": "#060B14",
          "circle-stroke-width": 0.8,
        },
      });

      // ---- مواقع الإنفاذ الحقيقية (P7)
      map.addSource("validation", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "validation-halo",
        type: "circle",
        source: "validation",
        paint: {
          "circle-radius": 11,
          "circle-color": "transparent",
          "circle-stroke-color": ["match", ["get", "scope"], "in_methodology", "#2DD4BF", "#8FA3BF"],
          "circle-stroke-width": 1.6,
        },
      });
      map.addLayer({
        id: "validation-dot",
        type: "circle",
        source: "validation",
        paint: {
          "circle-radius": 4.5,
          "circle-color": ["match", ["get", "scope"], "in_methodology", "#2DD4BF", "#8FA3BF"],
        },
      });

      loadedRef.current = true;
      syncData();
    });

    // تفاعل الحقول
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.properties?.id as string;
      if (onFieldClick) onFieldClick(id);
    };
    map.on("click", "fields-fill", clickHandler);
    map.on("click", "fields-points", clickHandler);
    ["fields-fill", "fields-points"].forEach((l) => {
      map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
    });

    // popup لمواقع الإنفاذ
    map.on("click", "validation-dot", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, string>;
      new maplibregl.Popup({ closeButton: false, maxWidth: "280px" })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:12px;line-height:1.5">
             <strong>${lang === "ar" ? p.name_ar : p.name_en}</strong><br/>
             <span style="color:#8FA3BF">${lang === "ar" ? p.detail_ar : p.detail_en}</span><br/>
             <span style="color:#5C7191;font-size:10px">${p.source} · ${p.coords_note ?? ""}</span>
           </div>`,
        )
        .addTo(map);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // مزامنة البيانات مع الطبقات
  function syncData() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    if (basins) {
      (map.getSource("basins") as maplibregl.GeoJSONSource)?.setData(basins as never);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (showBasinLabels) {
        for (const b of basins.features) {
          const ring = b.geometry.coordinates[0];
          const cx = ring.reduce((s, c) => s + c[0], 0) / ring.length;
          const cy = ring.reduce((s, c) => s + c[1], 0) / ring.length;
          const el = document.createElement("div");
          const name = lang === "ar" ? b.properties.name_ar : b.properties.name_en;
          const pct = b.properties.exploitation_pct;
          el.innerHTML = `<div style="text-align:center;pointer-events:none">
              <div style="font-family:var(--font-almarai);font-weight:800;font-size:12px;color:#E6EDF7;text-shadow:0 1px 6px #060B14">${name}</div>
              ${pct ? `<div style="font-size:11px;font-weight:700;color:${b.properties.status === "modeled" ? "#F43F5E" : "#F59E0B"};text-shadow:0 1px 6px #060B14">${pct}%</div>` : ""}
            </div>`;
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([cx, cy]).addTo(map));
        }
      }
    }
    if (exclusions) {
      (map.getSource("exclusions") as maplibregl.GeoJSONSource)?.setData(exclusions as never);
    }
    if (fields) {
      (map.getSource("fields") as maplibregl.GeoJSONSource)?.setData(fields as never);
    }
    if (validationSites) {
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: validationSites.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: { ...s },
        })),
      };
      (map.getSource("validation") as maplibregl.GeoJSONSource)?.setData(fc as never);
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loadedRef.current) syncData();
    else map.on("load", syncData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, basins, exclusions, validationSites, showBasinLabels, lang]);

  // فلتر آلة الزمن
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const filter =
      yearFilter != null ? (["<=", ["get", "first_seen_year"], yearFilter] as never) : null;
    ["fields-fill", "fields-outline", "fields-points"].forEach((l) => {
      if (map.getLayer(l)) map.setFilter(l, filter);
    });
  }, [yearFilter]);

  // تركيز على حقل
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusFieldId || !fields) return;
    const f = fields.features.find((x) => x.properties.id === focusFieldId);
    if (f) {
      map.flyTo({ center: f.properties.centroid as [number, number], zoom: 12.5, duration: 1200 });
    }
  }, [focusFieldId, fields]);

  return <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl border border-space-700 ${className}`} />;
}
