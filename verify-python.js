// verify-python.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Verifying Python environment...');

try {
  // Check Python version
  try {
    const pythonVersion = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    console.log('Python version:', pythonVersion);
  } catch (error) {
    console.error('Python not found or error checking version:', error.message);
    
    // Try python3 as an alternative
    try {
      console.log('Trying python3 command instead...');
      const python3Version = execSync('python3 --version', { stdio: 'pipe' }).toString().trim();
      console.log('Python3 version:', python3Version);
      
      // Create a symlink to python3 if python doesn't exist
      console.log('Creating symlink from python3 to python...');
      execSync('ln -sf $(which python3) /usr/local/bin/python', { stdio: 'inherit' });
      console.log('Symlink created');
    } catch (python3Error) {
      console.error('Python3 not found either:', python3Error.message);
      throw new Error('No Python installation found. Please install Python 3.9.7');
    }
  }
  
  // Ensure pip is available
  try {
    const pipVersion = execSync('pip --version', { stdio: 'pipe' }).toString().trim();
    console.log('pip version:', pipVersion);
  } catch (pipError) {
    console.error('pip not found, trying pip3...');
    
    try {
      const pip3Version = execSync('pip3 --version', { stdio: 'pipe' }).toString().trim();
      console.log('pip3 version:', pip3Version);
      
      // Create a symlink to pip3 if pip doesn't exist
      console.log('Creating symlink from pip3 to pip...');
      execSync('ln -sf $(which pip3) /usr/local/bin/pip', { stdio: 'inherit' });
      console.log('Symlink created');
    } catch (pip3Error) {
      console.error('pip3 not found either:', pip3Error.message);
      console.log('Attempting to install pip...');
      execSync('curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python get-pip.py', { stdio: 'inherit' });
    }
  }
  
  // Verify Python environment variables
  console.log('\nPython Environment Variables:');
  console.log('PYTHON_VERSION:', process.env.PYTHON_VERSION || 'not set');
  console.log('PYTHONPATH:', process.env.PYTHONPATH || 'not set');
  
  // Create or update .python-version file
  const pythonVersionPath = path.join(process.cwd(), '.python-version');
  fs.writeFileSync(pythonVersionPath, '3.9.7');
  console.log('Created/Updated .python-version file with Python version 3.9.7');
  
  console.log('Python environment verification completed successfully');
} catch (error) {
  console.error('Error verifying Python environment:', error.message);
  console.log('Continuing despite error...');
}
