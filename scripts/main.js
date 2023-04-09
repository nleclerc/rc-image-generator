
const TEST_MODE_REGEX = /test=(\d+)/

const FORMATS = {
	jpg: {
		mimeType: 'image/jpeg',
		ext: 'jpg',
		quality: .9
	},
	png: {
		mimeType: 'image/png',
		ext: 'png',
		quality: 1
	}
};

(async ()=> {
	console.log('Starting...')

	// setting moment locale.
	moment.locale('fr')

	const events = await loadJson('data/events.json')
	console.debug('Loaded data:',events)

	const typeSelector = document.querySelector('#typeSelector')
	const dateSelector = document.querySelector('#dateSelector')
	const startTimeInput = document.querySelector('#startTimeInput')
	const endTimeInput = document.querySelector('#endTimeInput')
	const numberInput = document.querySelector('#numberInput')
	const textInput = document.querySelector('#textInput')

	const generateButton = document.querySelector('#generateButton')

	if (isTestMode()) {
		const resultImg = document.createElement('img')
		resultImg.id = 'result'
		document.querySelector('#mainContainer > .container').append(resultImg)
	}

	const eventMap = {}
	for (const event of events) {
		console.debug('Processing event:',event)
		eventMap[event.type] = event
		const newOption = document.createElement('option')
		newOption.value = event.type
		newOption.text = event.name

		if (document.location.hash == `#${event.type}`)
			newOption.selected = true

		typeSelector.add(newOption)
	}

	dateSelector.value = moment().format('YYYY-MM-DD')
	startTimeInput.value = endTimeInput.value = moment().format('HH:mm')

	generateButton.addEventListener('click',async ()=> {
		const eventDate = moment(dateSelector.value)
		const startTime = startTimeInput.value
		const endTime = endTimeInput.value
		const number = numberInput.value
		const usertext = textInput.value
		await generateImages(eventMap[typeSelector.value],eventDate,startTime,endTime,number,usertext)
	})
})()

async function generateImages(eventData,eventDate,startTime,endTime,number,usertext) {
	console.log('Generating images for:',eventData.type)

	if (isTestMode()) {
		const imageIndex = getTestModeIndex()
		console.debug('Using test mode:',imageIndex)
		const selectedImage = eventData.images[imageIndex]

		if (!selectedImage)
			throw new Errort(`Invalid test mode index: ${imageIndex}`)

		const canvas = await generateImage(eventData.type,eventDate,startTime,endTime,selectedImage,number,usertext)
		document.querySelector('#result').src = canvas.toDataURL()
		return
	}

	for (const image of eventData.images) {
		const canvas = await generateImage(eventData.type,eventDate,startTime,endTime,image,number,usertext)
		const filename = `${eventDate.format('YYYY-MM-DD')}-${eventData.type}-${image.file.replace(/\.[^.]+$/,'')}`
		downloadCanvasImage(canvas,filename,image.format)
	}
}

async function generateImage(eventType,eventDate,startTime,endTime,imageData,number,usertext) {
	console.log('Generating image:',eventType,eventDate,startTime,endTime,number,imageData,usertext)
	const img = await loadImage(`data/${eventType}/${imageData.file}`)
	console.debug('Image loaded:',img,img.width,img.height)

	const canvas = document.createElement('canvas')
	canvas.width = img.width
	canvas.height = img.height

	const ctx = canvas.getContext('2d')
	ctx.drawImage(img,0,0)

	ctx.textAlign = 'center'

	for (const text of imageData.texts) {
		let textValue = ''
		switch(text.type) {
			case 'date':
				console.debug('Processing date:',text)
				textValue = eventDate.format(text.format)
				break

			case 'startendtime':
				console.debug('Processing startendtime:',text)
				textValue = `${startTime.substring(0,2)}h - ${endTime.substring(0,2)}h`
				break

			case 'starttime':
				console.debug('Processing starttime:',text)
				textValue = `${startTime.substring(0,2)}h`
				break

			case 'endtime':
				console.debug('Processing endtime:',text)
				textValue = `${endTime.substring(0,2)}h`
				break

			case 'fulldate':
				console.debug('Processing fulldate:',text)
				textValue = `${eventDate.format('dddd D MMMM')}`
				break

			case 'fulltimes':
				console.debug('Processing fulltimes:',text)
				textValue = `de ${startTime.substring(0,2)}h à ${endTime.substring(0,2)}h`
				break

			case 'fullstarttime':
				console.debug('Processing fullstarttime:',text)
				textValue = startTime.replace(':','h')
				break

			case 'fulldateandtimes':
				console.debug('Processing fulldateandtimes:',text)
				textValue = `${eventDate.format('dddd D MMMM')} de ${startTime.substring(0,2)}h à ${endTime.substring(0,2)}h`
				break

			case 'text':
				console.debug('Processing text:',text)
				textValue = text.value
				break

			case 'usertext':
				console.debug('Processing text:',usertext)
				textValue = usertext
				break

			case 'number':
				console.debug('Processing number:',text)
				textValue = `#${number}`
				break

			default:
				console.error('Invalid text:',text)
		}

		if (text.capitalize)
			textValue = `${textValue[0].toUpperCase()}${textValue.substring(1)}`

		if (text.allcaps)
			textValue = textValue.toUpperCase()

		console.debug('Using text value:',textValue)
		ctx.font = text.font
		ctx.fillStyle = text.color
		ctx.fillText(textValue,text.position.x,text.position.y)
	}

	return canvas
}

function isTestMode() {
	return TEST_MODE_REGEX.test(document.location.search)
}

function getTestModeIndex() {
	const match = TEST_MODE_REGEX.exec(document.location.search)
	if (!match)
		throw new Error('Test mode isn\'t set.')
	return parseInt(match[1],10)
}

function downloadCanvasImage(canvas,name,type='jpg') {
	console.log('Downloading image:',canvas,name,type)
	const format = FORMATS[type]
	console.debug('Using format:',format)
	//console.debug('Data:',canvas.toDataURL(format.mimeType,format.quality))
	const imageData = canvas.toDataURL(format.mimeType,format.quality).replace(format.mimeType,'image/octet-stream')
	const link = document.createElement('a')
	link.download = `${name}.${format.ext}`
	link.href = imageData
	link.click()
}

async function loadImage(url) {
	console.log('Loading image:',url)
	const img = new Image()

	await new Promise((resolve,reject)=> {
		img.onload = resolve
		img.onerror = reject
		img.src = url
	})

	return img
}

async function loadJson(url) {
	const response = await fetch(url)
	return response.json()
}
