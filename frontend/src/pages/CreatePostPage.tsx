import { PostCreate } from '../components'

function CreatePostPage() {
  const handlePostCreated = () => {
    // Navigate back to channel view or show success message
    console.log('Post created successfully!')
  }

  return (
    <div className="create-post-page">
      <PostCreate onPostCreated={handlePostCreated} />
    </div>
  )
}

export default CreatePostPage