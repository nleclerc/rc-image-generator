
const FORMATS = {
	jpg: {
		mimeType: 'image/jpg',
		ext: 'jpg',
		quality: .8
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

	const generateButton = document.querySelector('#generateButton')

	const eventMap = {}
	for (const event of events) {
		console.debug('Processing event:',event)
		eventMap[event.type] = event
		const newOption = document.createElement('option')
		newOption.value = event.type
		newOption.text = event.name

		typeSelector.add(newOption)
	}

	dateSelector.value = moment().format('YYYY-MM-DD')
	startTimeInput.value = endTimeInput.value = moment().format('HH:mm')

	generateButton.addEventListener('click',async ()=> {
		const eventDate = moment(dateSelector.value)
		const startTime = startTimeInput.value
		const endTime = endTimeInput.value
		await generateImages(eventMap[typeSelector.value],eventDate,startTime,endTime)
	})
})()

async function generateImages(eventData,eventDate,startTime,endTime) {
	console.log('Generating images for:',eventData.type)

	for (const image of eventData.images) {
		const canvas = await generateImage(eventData.type,eventDate,startTime,endTime,image)
		downloadCanvasImage(canvas,`${eventDate.format('YYYY-MM-DD')}-${eventData.type}-${image.file.replace(/\.[^.]+$/,'')}`)
	}
}

async function generateImage(eventType,eventDate,startTime,endTime,imageData) {
	console.log('Generating image:',eventType,eventDate,startTime,endTime,imageData)
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

function downloadCanvasImage(canvas,name,type='jpg') {
	console.log('Downloading image:',canvas,name,type)
	const format = FORMATS[type]
	console.debug('Using format:',format)
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