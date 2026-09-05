import { useEffect } from 'react'
import { BASE_URL, DEFAULT_KEYWORDS, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, SITE_NAME } from '../lib/seo'

type SeoProps = {
  title: string
  description?: string
  keywords?: string
  path?: string
  image?: string
  type?: 'website' | 'article' | 'video.other'
  noindex?: boolean
  schema?: Record<string, unknown>
}

const updateMeta = (attrName: string, attrValue: string, content: string) => {
  const selector = `meta[${attrName}="${attrValue}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attrName, attrValue)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

const updateLink = (rel: string, href: string) => {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

export default function Seo({
  title,
  description,
  keywords,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  schema,
}: SeoProps) {
  const pageUrl = `${BASE_URL.replace(/\/$/, '')}${path}`
  const fullTitle = `${SITE_NAME} | ${title}`
  const safeDescription = description || DEFAULT_DESCRIPTION
  const safeKeywords = keywords || DEFAULT_KEYWORDS
  const safeImage = image || DEFAULT_IMAGE
  const schemaJson = schema ? JSON.stringify({ '@context': 'https://schema.org', ...schema }, null, 2) : null

  useEffect(() => {
    document.title = fullTitle
    updateLink('canonical', pageUrl)
    updateMeta('name', 'description', safeDescription)
    updateMeta('name', 'keywords', safeKeywords)
    updateMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    updateMeta('property', 'og:type', type)
    updateMeta('property', 'og:title', fullTitle)
    updateMeta('property', 'og:description', safeDescription)
    updateMeta('property', 'og:url', pageUrl)
    updateMeta('property', 'og:image', safeImage)
    updateMeta('property', 'og:site_name', SITE_NAME)

    updateMeta('name', 'twitter:card', 'summary_large_image')
    updateMeta('name', 'twitter:title', fullTitle)
    updateMeta('name', 'twitter:description', safeDescription)
    updateMeta('name', 'twitter:image', safeImage)
  }, [fullTitle, pageUrl, safeDescription, safeKeywords, safeImage, type, noindex])

  return schemaJson ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} /> : null
}
