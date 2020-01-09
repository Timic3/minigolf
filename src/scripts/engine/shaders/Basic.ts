export const vertexSource = `
layout (location = 0) in vec3 aPosition;
#ifdef HAS_NORMALS
layout (location = 1) in vec3 aNormals;
out vec3 vNormals;
#endif
#ifdef HAS_TEXCOORDS
layout (location = 2) in vec2 aTexCoords;
#endif
#ifdef HAS_COLORS
layout (location = 3) in vec4 aColor;
out vec4 vColor;
#endif

uniform mat4 uView;
uniform mat4 uProjection;
uniform mat4 uModel;

out vec3 vPosition;
out vec2 vTexCoords;

void main() {
    vec4 pos = uModel * vec4(aPosition, 1.0);
    vPosition = vec3(pos.xyz) / pos.w;

#ifdef HAS_NORMALS
#ifdef IS_WATER
    vNormals = aNormals;
#else
    mat4 uNormals = transpose(inverse(uModel));
    vNormals = normalize(vec3(uNormals * vec4(normalize(aNormals).xyz, 1.0)));
#endif
#endif

    vTexCoords = vec2(0.0, 0.0);
#ifdef HAS_TEXCOORDS
    vTexCoords = aTexCoords;
#endif

#ifdef HAS_COLORS
    vColor = aColor;
#endif

    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

export const functions = `
const float M_PI = 3.141592653589793;

const float c_MinReflectance = 0.04;

struct AngularInfo
{
    float NdotL;                  // cos angle between normal and light direction
    float NdotV;                  // cos angle between normal and view direction
    float NdotH;                  // cos angle between normal and half vector
    float LdotH;                  // cos angle between light direction and half vector

    float VdotH;                  // cos angle between view direction and half vector

    vec3 padding;
};

vec4 getVertexColor()
{
    vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

#ifdef HAS_COLORS
    color = vColor;
#endif

    return color;
}

vec2 getNormalUV()
{
    vec3 uv = vec3(vTexCoords, 1.0);

    #ifdef HAS_NORMAL_UV_TRANSFORM
    uv *= u_NormalUVTransform;
    #endif

    return uv.xy;
}

vec3 getNormal()
{
    vec2 UV = getNormalUV();

    // Retrieve the tangent space matrix
#ifndef HAS_TANGENTS
    vec3 pos_dx = dFdx(vPosition);
    vec3 pos_dy = dFdy(vPosition);
    vec3 tex_dx = dFdx(vec3(UV, 0.0));
    vec3 tex_dy = dFdy(vec3(UV, 0.0));
    vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

#ifdef HAS_NORMALS
    vec3 ng = normalize(vNormals);
#else
    vec3 ng = cross(pos_dx, pos_dy);
#endif

    t = normalize(t - ng * dot(ng, t));
    vec3 b = normalize(cross(ng, t));
    mat3 tbn = mat3(t, b, ng);
#else // HAS_TANGENTS
    mat3 tbn = v_TBN;
#endif

#ifdef HAS_NORMAL_MAP
    vec3 n = texture2D(u_NormalSampler, UV).rgb;
    n = normalize(tbn * ((2.0 * n - 1.0) * vec3(u_NormalScale, u_NormalScale, 1.0)));
#else
    // The tbn matrix is linearly interpolated, so we need to re-normalize
    vec3 n = normalize(tbn[2].xyz);
#endif

    return n;
}

vec3 getSurface()
{
    vec2 UV = getNormalUV();

    // Retrieve the tangent space matrix
#ifndef HAS_TANGENTS
    vec3 pos_dx = dFdx(vPosition);
    vec3 pos_dy = dFdy(vPosition);
    vec3 tex_dx = dFdx(vec3(UV, 0.0));
    vec3 tex_dy = dFdy(vec3(UV, 0.0));
    vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);

#ifdef HAS_NORMALS
    vec3 ng = normalize(vNormals);
#else
    vec3 ng = cross(pos_dx, pos_dy);
#endif

    t = normalize(t - ng * dot(ng, t));
    vec3 b = normalize(cross(ng, t));
    mat3 tbn = mat3(t, b, ng);
#else // HAS_TANGENTS
    mat3 tbn = v_TBN;
#endif

    // The tbn matrix is linearly interpolated, so we need to re-normalize
    vec3 n = normalize(tbn[2].xyz);

    return n;
}

float getPerceivedBrightness(vec3 vector)
{
    return sqrt(0.299 * vector.r * vector.r + 0.587 * vector.g * vector.g + 0.114 * vector.b * vector.b);
}

AngularInfo getAngularInfo(vec3 pointToLight, vec3 normal, vec3 view)
{
    // Standard one-letter names
    vec3 n = normalize(normal);           // Outward direction of surface point
    vec3 v = normalize(view);             // Direction from surface point to view
    vec3 l = normalize(pointToLight);     // Direction from surface point to light
    vec3 h = normalize(l + v);            // Direction of the vector between l and v

    float NdotL = clamp(dot(n, l), 0.0, 1.0);
    float NdotV = clamp(dot(n, v), 0.0, 1.0);
    float NdotH = clamp(dot(n, h), 0.0, 1.0);
    float LdotH = clamp(dot(l, h), 0.0, 1.0);
    float VdotH = clamp(dot(v, h), 0.0, 1.0);

    return AngularInfo(
        NdotL,
        NdotV,
        NdotH,
        LdotH,
        VdotH,
        vec3(0, 0, 0)
    );
}

float clampedDot(vec3 x, vec3 y)
{
    return clamp(dot(x, y), 0.0, 1.0);
}
`;

export const tonemapping = `
const float GAMMA = 2.2;
const float INV_GAMMA = 1.0 / GAMMA;

// linear to sRGB approximation
// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html
vec3 LINEARtoSRGB(vec3 color)
{
    return pow(color, vec3(INV_GAMMA));
}

// sRGB to linear approximation
// see http://chilliant.blogspot.com/2012/08/srgb-approximations-for-hlsl.html
vec4 SRGBtoLINEAR(vec4 srgbIn)
{
    return vec4(pow(srgbIn.xyz, vec3(GAMMA)), srgbIn.w);
}

// Uncharted 2 tone map
// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapUncharted2Impl(vec3 color)
{
    const float A = 0.15;
    const float B = 0.50;
    const float C = 0.10;
    const float D = 0.20;
    const float E = 0.02;
    const float F = 0.30;
    return ((color*(A*color+C*B)+D*E)/(color*(A*color+B)+D*F))-E/F;
}

vec3 toneMapUncharted(vec3 color)
{
    const float W = 11.2;
    color = toneMapUncharted2Impl(color * 2.0);
    vec3 whiteScale = 1.0 / toneMapUncharted2Impl(vec3(W));
    return LINEARtoSRGB(color * whiteScale);
}

// Hejl Richard tone map
// see: http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapHejlRichard(vec3 color)
{
    color = max(vec3(0.0), color - vec3(0.004));
    return (color*(6.2*color+.5))/(color*(6.2*color+1.7)+0.06);
}

// ACES tone map
// see: https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 toneMapACES(vec3 color)
{
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    return LINEARtoSRGB(clamp((color * (A * color + B)) / (color * (C * color + D) + E), 0.0, 1.0));
}

vec3 toneMap(vec3 color)
{
    color *= uExposure;

#ifdef TONEMAP_UNCHARTED
    return toneMapUncharted(color);
#endif

#ifdef TONEMAP_HEJLRICHARD
    return toneMapHejlRichard(color);
#endif

#ifdef TONEMAP_ACES
    return toneMapACES(color);
#endif

    return LINEARtoSRGB(color);
}
`;

export const fragmentSource = `
precision highp float;

in vec3 vPosition;
in vec2 vTexCoords;

#ifdef HAS_NORMALS
in vec3 vNormals;
#endif

#ifdef HAS_COLORS
in vec4 vColor;
#endif

uniform vec3 uCamera;

uniform float uMetallicFactor;
uniform float uRoughnessFactor;
uniform vec4 uBaseColorFactor;

float uExposure = 1.0;

${functions}
${tonemapping}

out vec4 outColor;

// KHR_lights_punctual extension.
// see https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual

struct Light {
    vec3 direction;
    float range;

    vec3 color;
    float intensity;

    vec3 position;
    float innerConeCos;

    float outerConeCos;
    int type;

    vec2 padding;
};

// SPECULARGLOSSINESS
uniform vec3 u_SpecularFactor;
uniform vec4 u_DiffuseFactor;
uniform float u_GlossinessFactor;

//Sheen extension
uniform float u_SheenIntensityFactor;
uniform vec3 u_SheenColorFactor;
uniform float u_SheenRoughness;

//Clearcoat
uniform float u_ClearcoatFactor;
uniform float u_ClearcoatRoughnessFactor;

// ALPHAMODE_MASK
uniform float u_AlphaCutoff;

uniform int u_MipCount;

vec4 getBaseColor()
{
    vec4 baseColor = vec4(1.0, 1.0, 1.0, 1.0);

    #if defined(MATERIAL_SPECULARGLOSSINESS)
        baseColor = u_DiffuseFactor;
    #elif defined(MATERIAL_METALLICROUGHNESS)
        baseColor = uBaseColorFactor;
    #endif

    #if defined(MATERIAL_SPECULARGLOSSINESS) && defined(HAS_DIFFUSE_MAP)
        baseColor *= SRGBtoLINEAR(texture(u_DiffuseSampler, getDiffuseUV()));
    #elif defined(MATERIAL_METALLICROUGHNESS) && defined(HAS_BASE_COLOR_MAP)
        baseColor *= SRGBtoLINEAR(texture(u_BaseColorSampler, getBaseColorUV()));
    #endif

    return baseColor * getVertexColor();
}

struct MaterialInfo
{
    float perceptualRoughness;    // roughness value, as authored by the model creator (input to shader)
    vec3 f0;            // full reflectance color (normal incidence angle)

    float alphaRoughness;         // roughness mapped to a more linear change in the roughness (proposed by [2])
    vec3 diffuseColor;            // color contribution from diffuse lighting

    vec3 f90;           // reflectance color at grazing angle
    vec3 specularColor;           // color contribution from specular lighting

    vec3 normal;

    vec3 baseColor;
    float sheenIntensity;
    vec3 sheenColor;
    float sheenRoughness;

    float clearcoatFactor;
    vec3 clearcoatNormal;
    float clearcoatRoughness;
};

// Lambert lighting
// see https://seblagarde.wordpress.com/2012/01/08/pi-or-not-to-pi-in-game-lighting-equation/
vec3 lambertian(vec3 diffuseColor)
{
    return diffuseColor / M_PI;
}

// The following equation models the Fresnel reflectance term of the spec equation (aka F())
// Implementation of fresnel from [4], Equation 15
vec3 fresnelReflection(vec3 f0, vec3 f90, float VdotH)
{
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}

// Smith Joint GGX
// Note: Vis = G / (4 * NdotL * NdotV)
// see Eric Heitz. 2014. Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs. Journal of Computer Graphics Techniques, 3
// see Real-Time Rendering. Page 331 to 336.
// see https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/geometricshadowing(specularg)
float visibility(float NdotL, float NdotV, float alphaRoughness)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL;
    if (GGX > 0.0)
    {
        return 0.5 / GGX;
    }
    return 0.0;
}

// The following equation(s) model the distribution of microfacet normals across the area being drawn (aka D())
// Implementation from "Average Irregularity Representation of a Roughened Surface for Ray Reflection" by T. S. Trowbridge, and K. P. Reitz
// Follows the distribution function recommended in the SIGGRAPH 2013 course notes from EPIC Games [1], Equation 3.
float microfacetDistribution(float NdotH, float alphaRoughness)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;
    float f = (NdotH * NdotH) * (alphaRoughnessSq - 1.0) + 1.0;
    return alphaRoughnessSq / (M_PI * f * f);
}

//Sheen implementation-------------------------------------------------------------------------------------
// See  https://github.com/sebavan/glTF/tree/KHR_materials_sheen/extensions/2.0/Khronos/KHR_materials_sheen

// Estevez and Kulla http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float CharlieDistribution(float sheenRoughness, float NdotH)
{
    //float alphaG = sheenRoughness * sheenRoughness;
    float invR = 1.0 / sheenRoughness;
    float cos2h = NdotH * NdotH;
    float sin2h = 1.0 - cos2h;
    return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * M_PI);
}

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs#L136
float NeubeltVisibility(float NdotL, float NdotV)
{
    return clamp(1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV)),0.0,1.0);
}

vec3 sheenLayer(vec3 sheenColor, float sheenIntensity, float sheenRoughness, float NdotL, float NdotV, float NdotH, vec3 diffuse_term)
{
    float sheenDistribution = CharlieDistribution(sheenRoughness, NdotH);
    float sheenVisibility = NeubeltVisibility(NdotL, NdotV);
    return sheenColor * sheenIntensity * sheenDistribution * sheenVisibility + (1.0 - sheenIntensity * sheenDistribution * sheenVisibility) * diffuse_term;
}

//--------------------- Clearcoat -------------------------------------------------------------------------
// See https://github.com/ux3d/glTF/tree/KHR_materials_pbrClearcoat/extensions/2.0/Khronos/KHR_materials_clearcoat
vec3 clearcoatBlending(vec3 color, vec3 clearcoatLayer, float clearcoatFactor, float NdotV, float NdotL, float VdotH)
{
    vec3 factor0 = (1.0 - clearcoatFactor * fresnelReflection(vec3(0.04), vec3(1.0), NdotV)) * (1.0 - clearcoatFactor * fresnelReflection(vec3(0.04), vec3(1.0), NdotL));
    vec3 factor1 = clearcoatFactor * fresnelReflection(vec3(0.04), vec3(1.0), VdotH);
    return color * factor0 + clearcoatLayer * factor1;
}


//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#acknowledgments AppendixB
vec3 diffuseBRDF(vec3 f0, vec3 f90, vec3 diffuseColor, float VdotH)
{
    return (1.0 - fresnelReflection(f0, f90, VdotH)) * lambertian(diffuseColor);
}

//  https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#acknowledgments AppendixB
vec3 specularMicrofacetBRDF (vec3 f0, vec3 f90, float alphaRoughness, float VdotH, float NdotL, float NdotV, float NdotH)
{
    vec3 F = fresnelReflection(f0, f90, VdotH);
    float Vis = visibility(NdotL, NdotV, alphaRoughness);
    float D = microfacetDistribution(NdotH, alphaRoughness);

    return F * Vis * D;
}

// Calculation of the lighting contribution from an optional Image Based Light source.
// Precomputed Environment Maps are required uniform inputs and are computed as outlined in [1].
// See our README.md on Environment Maps [3] for additional discussion.
#ifdef USE_IBL
vec3 getIBLContribution(MaterialInfo materialInfo, vec3 v)
{
    float NdotV = clamp(dot(materialInfo.normal, v), 0.0, 1.0);

    float lod = clamp(materialInfo.perceptualRoughness * float(u_MipCount), 0.0, float(u_MipCount));
    vec3 reflection = normalize(reflect(-v, materialInfo.normal));

    vec2 brdfSamplePoint = clamp(vec2(NdotV, materialInfo.perceptualRoughness), vec2(0.0, 0.0), vec2(1.0, 1.0));
    // retrieve a scale and bias to F0. See [1], Figure 3
    vec2 brdf = texture(u_brdfLUT, brdfSamplePoint).rg;

    vec4 diffuseSample = texture(u_DiffuseEnvSampler, materialInfo.normal);
    vec4 specularSample = textureLod(u_SpecularEnvSampler, reflection, lod);

#ifdef USE_HDR
    // Already linear.
    vec3 diffuseLight = diffuseSample.rgb;
    vec3 specularLight = specularSample.rgb;
#else
    vec3 diffuseLight = SRGBtoLINEAR(diffuseSample).rgb;
    vec3 specularLight = SRGBtoLINEAR(specularSample).rgb;
#endif

    vec3 diffuse = diffuseLight * materialInfo.diffuseColor;
    vec3 specular = specularLight * (materialInfo.specularColor * brdf.x + brdf.y);

#ifdef MATERIAL_SHEEN
    float NdotL =  clampedDot(materialInfo.normal, reflection);
    vec3 h = normalize(reflection + v);
    float NdotH = clampedDot(materialInfo.normal, h);
    diffuse = sheenLayer(materialInfo.sheenColor, materialInfo.sheenIntensity, materialInfo.sheenRoughness, NdotL, NdotV, NdotH, diffuse);
#endif

#ifdef MATERIAL_CLEARCOAT
    NdotV = clamp(dot(materialInfo.clearcoatNormal, v), 0.0, 1.0);

    lod = clamp(materialInfo.clearcoatRoughness * float(u_MipCount), 0.0, float(u_MipCount));
    reflection = normalize(reflect(-v, materialInfo.clearcoatNormal));

    brdfSamplePoint = clamp(vec2(NdotV, materialInfo.clearcoatRoughness), vec2(0.0, 0.0), vec2(1.0, 1.0));
    // retrieve a scale and bias to F0. See [1], Figure 3
    brdf = texture(u_brdfLUT, brdfSamplePoint).rg;

    specularSample = textureLod(u_SpecularEnvSampler, reflection, lod);

    #ifdef USE_HDR
    // Already linear.
        specularLight = specularSample.rgb;
    #else
        specularLight = SRGBtoLINEAR(specularSample).rgb;
    #endif

    float NdotL =  clampedDot(materialInfo.clearcoatNormal, reflection);
    vec3 h = normalize(reflection + v);
    float VdotH = clampedDot(v, h);
    vec3 clearcoatLayer = specularLight * (vec3(1.0) * brdf.x + brdf.y);
    return clearcoatBlending(diffuse + specular, clearcoatLayer, materialInfo.clearcoatFactor, NdotV,  NdotL, VdotH);
#endif

    return diffuse + specular;
}
#endif


vec3 getPointShade(vec3 pointToLight, MaterialInfo materialInfo, vec3 view)
{
    AngularInfo angularInfo = getAngularInfo(pointToLight, materialInfo.normal, view);
    if (angularInfo.NdotL > 0.0 || angularInfo.NdotV > 0.0)
    {
        // Calculation of analytical ligh
        //https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#acknowledgments AppendixB
        vec3 diffuseContrib = diffuseBRDF(materialInfo.f0, materialInfo.f90, materialInfo.diffuseColor, angularInfo.VdotH);
        vec3 specContrib = specularMicrofacetBRDF(materialInfo.f0, materialInfo.f90, materialInfo.alphaRoughness, angularInfo.VdotH, angularInfo.NdotL, angularInfo.NdotV, angularInfo.NdotH);

        // Obtain final intensity as reflectance (BRDF) scaled by the energy of the light (cosine law)
        return angularInfo.NdotL * (diffuseContrib + specContrib);
    }

    return vec3(0.0, 0.0, 0.0);
}

// https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_lights_punctual/README.md#range-property
float getRangeAttenuation(float range, float distance)
{
    if (range <= 0.0)
    {
        // negative range means unlimited
        return 1.0;
    }
    return max(min(1.0 - pow(distance / range, 4.0), 1.0), 0.0) / pow(distance, 2.0);
}

// https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_lights_punctual/README.md#inner-and-outer-cone-angles
float getSpotAttenuation(vec3 pointToLight, vec3 spotDirection, float outerConeCos, float innerConeCos)
{
    float actualCos = dot(normalize(spotDirection), normalize(-pointToLight));
    if (actualCos > outerConeCos)
    {
        if (actualCos < innerConeCos)
        {
            return smoothstep(outerConeCos, innerConeCos, actualCos);
        }
        return 1.0;
    }
    return 0.0;
}

vec3 applyDirectionalLight(Light light, MaterialInfo materialInfo, vec3 view)
{
    vec3 pointToLight = -light.direction;
    vec3 shade = getPointShade(pointToLight, materialInfo, view);
    return light.intensity * light.color * shade;
}

vec3 applyPointLight(Light light, MaterialInfo materialInfo, vec3 view)
{
    vec3 pointToLight = light.position - vPosition;
    float distance = length(pointToLight);
    float attenuation = getRangeAttenuation(light.range, distance);
    vec3 shade = getPointShade(pointToLight, materialInfo, view);
    return attenuation * light.intensity * light.color * shade;
}

vec3 applySpotLight(Light light, MaterialInfo materialInfo, vec3 view)
{
    vec3 pointToLight = light.position - vPosition;
    float distance = length(pointToLight);
    float rangeAttenuation = getRangeAttenuation(light.range, distance);
    float spotAttenuation = getSpotAttenuation(pointToLight, light.direction, light.outerConeCos, light.innerConeCos);
    vec3 shade = getPointShade(pointToLight, materialInfo, view);
    return rangeAttenuation * spotAttenuation * light.intensity * light.color * shade;
}

void main()
{
    vec4 baseColor = getBaseColor();

#ifdef ALPHAMODE_MASK
    if(baseColor.a < u_AlphaCutoff)
    {
        discard;
    }
    baseColor.a = 1.0;
#endif

#ifdef ALPHAMODE_BLEND
    baseColor.a = 0.9;
#else
    baseColor.a = 1.0;
#endif

#ifdef MATERIAL_UNLIT
    outColor = (vec4(LINEARtoSRGB(baseColor.rgb), baseColor.a));
    return;
#endif

    // Metallic and Roughness material properties are packed together
    // In glTF, these factors can be specified by fixed scalar values
    // or from a metallic-roughness map
    float perceptualRoughness = 0.0;
    float metallic = 0.0;

    vec3 diffuseColor = vec3(0.0);
    vec3 specularColor = vec3(0.0);
    vec3 f0 = vec3(0.04);

    vec4 output_color = baseColor;

#ifdef MATERIAL_SPECULARGLOSSINESS

#ifdef HAS_SPECULAR_GLOSSINESS_MAP
    vec4 sgSample = SRGBtoLINEAR(texture(u_SpecularGlossinessSampler, getSpecularGlossinessUV()));
    perceptualRoughness = (1.0 - sgSample.a * u_GlossinessFactor); // glossiness to roughness
    f0 = sgSample.rgb * u_SpecularFactor; // specular
#else
    f0 = u_SpecularFactor;
    perceptualRoughness = 1.0 - u_GlossinessFactor;
#endif // ! HAS_SPECULAR_GLOSSINESS_MAP

    // f0 = specular
    specularColor = f0;
    float oneMinusSpecularStrength = 1.0 - max(max(f0.r, f0.g), f0.b);
    diffuseColor = baseColor.rgb * oneMinusSpecularStrength;

#endif // ! MATERIAL_SPECULARGLOSSINESS

#ifdef MATERIAL_METALLICROUGHNESS

#ifdef HAS_METALLIC_ROUGHNESS_MAP
    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
    vec4 mrSample = texture(u_MetallicRoughnessSampler, getMetallicRoughnessUV());
    perceptualRoughness = mrSample.g * uRoughnessFactor;
    metallic = mrSample.b * uMetallicFactor;
#else
    metallic = uMetallicFactor;
    perceptualRoughness = uRoughnessFactor;
#endif

    diffuseColor = baseColor.rgb * (vec3(1.0) - f0) * (1.0 - metallic);
    specularColor = mix(f0, baseColor.rgb, metallic);
#endif // ! MATERIAL_METALLICROUGHNESS

    MaterialInfo materialInfo;

    perceptualRoughness = clamp(perceptualRoughness, 0.0, 1.0);
    metallic = clamp(metallic, 0.0, 1.0);

    // Roughness is authored as perceptual roughness; as is convention,
    // convert to material roughness by squaring the perceptual roughness [2].
    float alphaRoughness = perceptualRoughness * perceptualRoughness;

    // Compute reflectance.
    float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);

    vec3 specularEnvironmentR0 = specularColor.rgb;
    // Anything less than 2% is physically impossible and is instead considered to be shadowing. Compare to "Real-Time-Rendering" 4th editon on page 325.
    vec3 specularEnvironmentR90 = vec3(clamp(reflectance * 50.0, 0.0, 1.0));

#ifdef MATERIAL_SHEEN
    #ifdef HAS_SHEEN_COLOR_INTENSITY_TEXTURE_MAP
        vec3 sheenSample = texture(u_sheenColorIntensitySampler, getSheenUV());
        materialInfo.sheenColor = sheenSample.xyz * u_SheenColorFactor;
        materialInfo.sheenIntensity = sheenSample.w * u_SheenIntensityFactor;
    #else
        materialInfo.sheenColor = u_SheenColorFactor;
        materialInfo.sheenIntensity = u_SheenIntensityFactor;
    #endif
    materialInfo.sheenRoughness = u_SheenRoughness;
#endif

#ifdef MATERIAL_CLEARCOAT
    #ifdef HAS_CLEARCOAT_TEXTURE_MAP
        vec4 ccSample = texture(u_ClearcoatSampler, getClearcoatUV());
        materialInfo.clearcoatFactor = ccSample.r * u_ClearcoatFactor;
    #else
        materialInfo.clearcoatFactor = u_ClearcoatFactor;
    #endif

    #ifdef HAS_CLEARCOAT_ROUGHNESS_MAP
        vec4 ccSampleRough = texture(u_ClearcoatRoughnessSampler, getClearcoatRoughnessUV());
        materialInfo.clearcoatRoughness = ccSampleRough.g * u_ClearcoatRoughnessFactor;
    #else
        materialInfo.clearcoatRoughness = u_ClearcoatRoughnessFactor;
    #endif

    #ifdef HAS_CLEARCOAT_NORMAL_MAP
        vec4 ccSampleNor = texture(u_ClearcoatNormalSampler, getClearcoatNormalUV());
        materialInfo.clearcoatNormal = ccSampleNor.xyz;
    #else
        materialInfo.clearcoatNormal = getSurface();
    #endif
#endif

    // LIGHTING
    vec3 color = vec3(baseColor.r * 0.15, baseColor.g * 0.15, baseColor.b * 0.15);
    vec3 normal = getNormal();
    vec3 view = normalize(uCamera - vPosition);

    materialInfo.perceptualRoughness = perceptualRoughness;
    materialInfo.f0 = specularEnvironmentR0;
    materialInfo.alphaRoughness = alphaRoughness;
    materialInfo.diffuseColor = diffuseColor;
    materialInfo.f90 = specularEnvironmentR90;
    materialInfo.specularColor = specularColor;
    materialInfo.normal = normal;
    materialInfo.baseColor = baseColor.rgb;

/*#ifdef USE_PUNCTUAL
    for (int i = 0; i < LIGHT_COUNT; ++i)
    {
        vec3 lightColor = vec3(0);
        Light light = u_Lights[i];
        if (light.type == LightType_Directional)
        {
            lightColor += applyDirectionalLight(light, materialInfo, view);
        }
        else if (light.type == LightType_Point)
        {
            lightColor += applyPointLight(light, materialInfo, view);
        }
        else if (light.type == LightType_Spot)
        {
            lightColor += applySpotLight(light, materialInfo, view);
        }
        color += lightColor;
    }
#endif*/
    //Light light2 = Light(vec3(-0.9243900179862976, -0.3468450903892517, 0.15875054895877838), 10.0, vec3(1, 0.5699955821037292, 0.2395770400762558), 8.0, vec3(0, 0, 500), 0.0, 0.7853975, 0, vec2(0, 0));
    Light light = Light(vec3(-0.12252257764339447, -0.6230136752128601, -0.7725556492805481), 10.0, vec3(1, 0.5699955821037292, 0.2395770400762558), 8.0, vec3(0, 0, 500), 0.0, 0.7853975, 0, vec2(0, 0));
    color += applyDirectionalLight(light, materialInfo, view);
    //color += applyDirectionalLight(light2, materialInfo, view);

    // Calculate lighting contribution from image based lighting source (IBL)
#ifdef USE_IBL
    color += getIBLContribution(materialInfo, view);
#endif

    float ao = 1.0;

    // Apply optional PBR terms for additional (optional) shading
#ifdef HAS_OCCLUSION_MAP
    ao = texture(u_OcclusionSampler,  getOcclusionUV()).r;
    color = mix(color, color * ao, u_OcclusionStrength);
#endif

    vec3 emissive = vec3(0, 0, 0); // u_EmissiveFactor
#ifdef HAS_EMISSIVE_MAP
    emissive *= SRGBtoLINEAR(texture(u_EmissiveSampler, getEmissiveUV())).rgb;
#endif
    color += emissive;

#ifndef DEBUG_OUTPUT // no debug

    // regular shading
    output_color = vec4(toneMap(color), baseColor.a);

#else // debug output

    #ifdef DEBUG_ROUGHNESS
        output_color.rgb = vec3(perceptualRoughness);
    #endif

    #ifdef DEBUG_NORMAL
        #ifdef HAS_NORMAL_MAP
            output_color.rgb = texture(u_NormalSampler, getNormalUV()).rgb;
        #else
            output_color.rgb = vec3(0.5, 0.5, 1.0);
        #endif
    #endif

    #ifdef DEBUG_BASECOLOR
        output_color.rgb = LINEARtoSRGB(baseColor.rgb);
    #endif

    #ifdef DEBUG_OCCLUSION
        output_color.rgb = vec3(ao);
    #endif

    #ifdef DEBUG_EMISSIVE
        output_color.rgb = LINEARtoSRGB(emissive).rgb;
    #endif

    #ifdef DEBUG_F0
        output_color.rgb = vec3(f0);
    #endif

    #ifdef DEBUG_ALPHA
        output_color.rgb = vec3(baseColor.a);
    #endif

    output_color.a = 1.0;

#endif // !DEBUG_OUTPUT

    outColor = output_color;
}
`;