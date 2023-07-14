import { createSlice } from '@reduxjs/toolkit'

interface UserState {
  username: string
}

const initialState: UserState = {
  username: 'GoForceX',
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setName: (state, action) => {
      state.username = action.payload
    },
  },
})

export const { setName } = userSlice.actions

export default userSlice.reducer