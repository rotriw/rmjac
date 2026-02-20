import { getProfile } from "@/api/client/api_user_info"
import {
  postAddEditor,
  postAddViewer,
  postGetEditor,
  postGetViewers,
  postRemoveEditor,
  postRemoveViewer,
} from "@/api/client/api_training_manage"
import type { PermOwner } from "@rmjac/api-declare"

export interface PermissionUser {
  iden: string
  name?: string
  userId?: number
  isPublic?: boolean
}

export interface PermissionData {
  editors: PermissionUser[]
  viewers: PermissionUser[]
}

const mapPermOwners = (owners: PermOwner[]): PermissionUser[] => {
  return owners.flatMap((owner) => {
    if ("User" in owner) {
      const user = owner.User
      return [
        {
          iden: user.iden,
          name: user.name,
          userId: Number(user.node_id),
        },
      ]
    }
    if ("Unknown" in owner) {
      const unknownId = Number(owner.Unknown)
      if (unknownId === -2) {
        return [
          {
            iden: "guest_user",
            name: "公开访问",
            userId: -2,
            isPublic: true,
          },
        ]
      }
    }
    return []
  })
}

const resolveUserId = async (iden: string): Promise<number> => {
  const profile = await getProfile({ iden })
  return Number(profile.user.node_id)
}

export async function getPermissions(
  userIden: string,
  trainingIden: string
): Promise<PermissionData> {
  const [editorsRes, viewersRes] = await Promise.all([
    postGetEditor({ user_iden: userIden, training_iden: trainingIden }),
    postGetViewers({ user_iden: userIden, training_iden: trainingIden }),
  ])

  return {
    editors: mapPermOwners(editorsRes.editor),
    viewers: mapPermOwners(viewersRes.viewer),
  }
}

export async function addEditor(
  userIden: string,
  trainingIden: string,
  editorIden: string
): Promise<void> {
  const userId = await resolveUserId(editorIden)
  await postAddEditor({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: userId,
  })
}

export async function removeEditor(
  userIden: string,
  trainingIden: string,
  editorIden: string
): Promise<void> {
  const userId = await resolveUserId(editorIden)
  await postRemoveEditor({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: userId,
  })
}

export async function addViewer(
  userIden: string,
  trainingIden: string,
  viewerIden: string
): Promise<void> {
  const userId = await resolveUserId(viewerIden)
  await postAddViewer({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: userId,
  })
}

export async function addPublicViewer(
  userIden: string,
  trainingIden: string
): Promise<void> {
  await postAddViewer({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: -2,
  })
}

export async function removeViewer(
  userIden: string,
  trainingIden: string,
  viewerIden: string
): Promise<void> {
  const userId = await resolveUserId(viewerIden)
  await postRemoveViewer({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: userId,
  })
}

export async function removePublicViewer(
  userIden: string,
  trainingIden: string
): Promise<void> {
  await postRemoveViewer({
    user_iden: userIden,
    training_iden: trainingIden,
    user_id: -2,
  })
}
