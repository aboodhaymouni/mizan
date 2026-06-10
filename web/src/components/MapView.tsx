"use client";
/**
 * خريطة غرفة التحكم — MapLibre GL
 * basemap حيّ:  NASA GIBS satellite (صور أقمار حقيقية، WMTS بلا مصادقة)  أو  Carto dark
 * طبقات: الأحواض (صحة) → الاستبعادات (RAMSAR) → الحقول (🔴🟠🟢) → مواقع الإنفاذ
 */
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BasinsFC, FieldsFC, ValidationSite } from "@/lib/types";
import { useLang } from "@/lib/i18n";

const JORDAN_BOUNDS: LngLatBoundsLike = [
  [34.6, 29.0],
  [39.6, 33.5],
];

export type Basemap = "satellite" | "dark";

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
  basemap?: Basemap;
  /** تاريخ صور GIBS الحيّة (YYYY-MM-DD) — للسفر عبر الزمن */
  satelliteDate?: string;
  showFields?: boolean;
}

const CARTO_TILES = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
];

// NASA GIBS — صور أقمار حقيقية حيّة (EPSG:3857 web mercator)
function gibsTiles(layer: string, date: string, level = 9) {
  return [
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.jpg`,
  ];
}

function buildStyle(basemap: Basemap, satDate: string): maplibregl.StyleSpecification {
  const sources: maplibregl.StyleSpecification["sources"] = {
    carto: { type: "raster", tiles: CARTO_TILES, tileSize: 256, attribution: "© OpenStreetMap © CARTO" },
    gibs: {
      type: "raster",
      tiles: gibsTiles("VIIRS_SNPP_CorrectedReflectance_TrueColor", satDate),
      tileSize: 256,
      maxzoom: 9,
      attribution: "NASA EOSDIS GIBS · VIIRS/MODIS",
    },
  };
  const layers: maplibregl.LayerSpecification[] = [
    { id: "bg", type: "background", paint: { "background-color": "#060B14" } },
  ];
  if (basemap === "satellite") {
    layers.push({ id: "gibs", type: "raster", source: "gibs", paint: { "raster-opacity": 1, "raster-fade-duration": 300 } });
    // طبقة تعتيم خفيفة لإبراز الـ overlays فوق الصورة
    layers.push({ id: "dim", type: "background", paint: { "background-color": "rgba(6,11,20,0.18)" } });
  } else {
    layers.push({ id: "carto", type: "raster", source: "carto", paint: { "raster-opacity": 0.85 } });
  }
  return { version: 8, sources, layers };
}

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
  basemap = "dark",
  satelliteDate = "2024-08-12",
  showFields = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false); // يُعيد تشغيل مزامنة البيانات بعد تحميل الخريطة
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const basemapRef = useRef<Basemap>(basemap);
  const satDateRef = useRef<string>(satelliteDate);
  const { lang } = useLang();

  function addOverlayLayers(map: MLMap) {
    if (map.getSource("basins")) return; // مضافة سلفاً
    // ---- الأحواض
    map.addSource("basins", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "basins-fill", type: "fill", source: "basins",
      paint: {
        "fill-color": ["match", ["get", "status"], "modeled", "#F43F5E", "secondary", "#F59E0B", "#27405F"],
        "fill-opacity": ["match", ["get", "status"], "modeled", 0.18, "secondary", 0.13, 0.06],
      },
    });
    map.addLayer({
      id: "basins-line", type: "line", source: "basins",
      paint: {
        "line-color": ["match", ["get", "status"], "modeled", "#F43F5E", "secondary", "#F59E0B", "#27405F"],
        "line-width": ["match", ["get", "status"], "modeled", 1.8, 1.1],
        "line-dasharray": [3, 2], "line-opacity": 0.85,
      },
    });
    // ---- الاستبعادات
    map.addSource("exclusions", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "exclusions-fill", type: "fill", source: "exclusions", paint: { "fill-color": "#38BDF8", "fill-opacity": 0.18 } });
    map.addLayer({ id: "exclusions-line", type: "line", source: "exclusions", paint: { "line-color": "#38BDF8", "line-width": 1.4, "line-dasharray": [2, 2] } });
    // ---- الحقول
    map.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "fields-fill", type: "fill", source: "fields", minzoom: 9,
      paint: { "fill-color": ["match", ["get", "tier"], "red", "#F43F5E", "orange", "#F59E0B", "#10B981"], "fill-opacity": 0.55 },
    });
    map.addLayer({
      id: "fields-outline", type: "line", source: "fields", minzoom: 9,
      paint: { "line-color": ["match", ["get", "tier"], "red", "#F43F5E", "orange", "#F59E0B", "#10B981"], "line-width": 1.2 },
    });
    map.addLayer({
      id: "fields-points", type: "circle", source: "fields", maxzoom: 9,
      paint: {
        "circle-color": ["match", ["get", "tier"], "red", "#F43F5E", "orange", "#F59E0B", "#10B981"],
        "circle-radius": ["interpolate", ["linear"], ["get", "area_ha"], 2, 2.5, 60, 7],
        "circle-opacity": 0.9, "circle-stroke-color": "#060B14", "circle-stroke-width": 0.8,
      },
    });
    // ---- مواقع الإنفاذ
    map.addSource("validation", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "validation-halo", type: "circle", source: "validation",
      paint: { "circle-radius": 11, "circle-color": "transparent", "circle-stroke-color": ["match", ["get", "scope"], "in_methodology", "#2DD4BF", "#E9B949"], "circle-stroke-width": 1.8 },
    });
    map.addLayer({
      id: "validation-dot", type: "circle", source: "validation",
      paint: { "circle-radius": 4.5, "circle-color": ["match", ["get", "scope"], "in_methodology", "#2DD4BF", "#E9B949"] },
    });
  }

  // إنشاء الخريطة مرة واحدة
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(basemap, satelliteDate),
      bounds: bounds ?? JORDAN_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    mapRef.current = map;
    basemapRef.current = basemap;

    map.on("load", () => {
      addOverlayLayers(map);
      loadedRef.current = true;
      setLoaded(true); // يحفّز useEffect المزامنة بأحدث props
      syncData();
    });

    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f && onFieldClick) onFieldClick(f.properties?.id as string);
    };
    map.on("click", "fields-fill", clickHandler);
    map.on("click", "fields-points", clickHandler);
    ["fields-fill", "fields-points"].forEach((l) => {
      map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
    });
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

  // تبديل الـ basemap أو تاريخ القمر الصناعي → إعادة بناء الـ style + الطبقات
  // (يتخطّى أول تشغيل: الـ style مبني سلفاً في إنشاء الخريطة — يمنع سباق إعادة البناء عند التحميل)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (basemapRef.current === basemap && satDateRef.current === satelliteDate) return;
    basemapRef.current = basemap;
    satDateRef.current = satelliteDate;
    map.setStyle(buildStyle(basemap, satelliteDate));
    map.once("styledata", () => {
      addOverlayLayers(map);
      syncData();
      applyYearFilter();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap, satelliteDate]);

  function syncData() {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getSource("basins")) return;

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
              <div style="font-family:var(--font-almarai);font-weight:800;font-size:12px;color:#fff;text-shadow:0 1px 8px #000,0 0 4px #000">${name}</div>
              ${pct ? `<div style="font-size:11px;font-weight:800;color:${b.properties.status === "modeled" ? "#FF6B81" : "#FBBF24"};text-shadow:0 1px 8px #000">${pct}%</div>` : ""}
            </div>`;
          markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([cx, cy]).addTo(map));
        }
      }
    }
    if (exclusions) (map.getSource("exclusions") as maplibregl.GeoJSONSource)?.setData(exclusions as never);
    if (fields && showFields) (map.getSource("fields") as maplibregl.GeoJSONSource)?.setData(fields as never);
    else if (!showFields) (map.getSource("fields") as maplibregl.GeoJSONSource)?.setData({ type: "FeatureCollection", features: [] } as never);
    if (validationSites) {
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: validationSites.map((s) => ({
          type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] }, properties: { ...s },
        })),
      };
      (map.getSource("validation") as maplibregl.GeoJSONSource)?.setData(fc as never);
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (loadedRef.current) syncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, basins, exclusions, validationSites, showBasinLabels, lang, showFields, loaded]);

  function applyYearFilter() {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer("fields-fill")) return;
    const filter = yearFilter != null ? (["<=", ["get", "first_seen_year"], yearFilter] as never) : null;
    ["fields-fill", "fields-outline", "fields-points"].forEach((l) => {
      if (map.getLayer(l)) map.setFilter(l, filter);
    });
  }
  useEffect(applyYearFilter, [yearFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusFieldId || !fields) return;
    const f = fields.features.find((x) => x.properties.id === focusFieldId);
    if (f) map.flyTo({ center: f.properties.centroid as [number, number], zoom: 12.5, duration: 1200 });
  }, [focusFieldId, fields]);

  return <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl border border-space-700 ${className}`} />;
}
