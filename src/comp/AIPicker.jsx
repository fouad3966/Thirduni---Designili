import CustomButtom from './CustomButtom'

const AIPicker = ({ prompt, setPrompt, generatingImg, generationError, handleSubmit }) => {
  return (
    <div
      className='aipicker-container'
      style={{ height: 'auto', minHeight: 220, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto' }}
    >
      <textarea
        className='aipicker-textarea'
        aria-label='Describe your garment design'
        aria-describedby={generationError ? 'generation-error' : undefined}
        aria-invalid={Boolean(generationError)}
        placeholder='Describe your full design...'
        rows={5}
        maxLength={1500}
        value={prompt}
        disabled={generatingImg}
        onChange={(e) => setPrompt(e.target.value)}
      />
      {generationError && (
        <p id='generation-error' role='alert' className='text-xs text-red-900 break-words'>
          {generationError}
        </p>
      )}
      {generatingImg && (
        <p role='status' className='text-xs text-gray-700'>
          Generating fabric. Free Spaces may take a few minutes.
        </p>
      )}
      <div className='flex flex-wrap gap-3'>
        <CustomButtom
          type={generatingImg ? 'outline' : 'filled'}
          title={generatingImg ? 'Asking AI...' : 'AI Full'}
          handleClick={() => handleSubmit('full')}
          customStyles='text-xs'
          disabled={generatingImg}
        />
      </div>
    </div>
  )
}

export default AIPicker
