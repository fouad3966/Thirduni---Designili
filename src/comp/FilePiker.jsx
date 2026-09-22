import React from 'react'
import CustomButtom from './CustomButtom'
const FilePiker = ({ file, setFile, readFile, supportsLogo = true }) => {
  return (
    <div className='filepicker-container'>
      <div className='flex-1 flex flex-col'>
        <input
          id="file-upload"
          type='file'
          accept='image/*'
          onChange={(e) => setFile(e.target.files[0])}
        />
        <label htmlFor='file-upload' className='filepicker-label'>
          Upload File
        </label>
        <p className='mt-2 text-grey-500 text-ex truncate'>
          {file === '' ? "No file selected" : file.name}
        </p>
      </div>
      <div className='mt-4 flex flex-wrap gap-3'>
        {supportsLogo && <CustomButtom
        title="Logo"
        type="outline"
        handleClick={()=>readFile('logo')}//call back function
       customStyles="text-xs"
       />}
        <CustomButtom
        title="Full"
        type="filled"
        handleClick={()=>readFile('full')}//call back function
       customStyles="text-xs"
       />
      </div>
    </div>
  )
}

export default FilePiker
