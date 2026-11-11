import type { CollectionConfig } from 'payload'

import { revalidateChampionships } from '@/lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    // Moving an image's Banner focus changes how the Previous Opens and venue pages crop it, but
    // those pages cache the championship data that carries the focus point. Refresh them when the
    // focus moves; any other edit to an image changes nothing they show.
    afterChange: [
      ({ doc, previousDoc, operation }) => {
        if (operation === 'update' && (doc.focalX !== previousDoc?.focalX || doc.focalY !== previousDoc?.focalY)) {
          revalidateChampionships()
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      // No column: a UI-only field that edits Payload's own focalX / focalY. See the component.
      name: 'bannerFocus',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/FocalPointPicker#FocalPointPicker',
        },
      },
    },
  ],
  upload: true,
}
